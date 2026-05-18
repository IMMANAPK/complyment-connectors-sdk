'use strict'
const { getProvider } = require('./providers/factory.cjs')

const REVIEWER_SYSTEM = `You are a TypeScript SDK code reviewer for the Complyment Connectors SDK.
Your job is to find specific correctness issues in generated connector code by comparing it to the API documentation.
Focus on: wrong base URL, wrong API paths, missing operations, wrong auth header, wrong HTTP methods.
Always respond with ONLY valid JSON — no markdown, no prose.`

const FIXER_SYSTEM = `You are a TypeScript SDK code fixer for the Complyment Connectors SDK.
You receive generated connector files and a list of specific issues, then return corrected file content.
Rules:
- Keep the class structure — only fix the specific reported issues
- Use exact paths from the API doc — never invent paths
- For path params like {id}, use template literals: \`/files/\${id}\`
- Return the same JSON keys as the input files
Always respond with ONLY valid JSON — no markdown, no prose.`

/**
 * Agent 1 — Code Reviewer
 * Cross-checks generated code against the API doc and analysis.
 * Returns { issues, needsFix, score }
 */
async function reviewGenerated(genResult, docText, analysis) {
  const filesSummary = Object.entries(genResult.files || {})
    .filter(([k]) => k !== 'registry_patch')
    .map(([k, v]) => `// === ${k} ===\n${String(v).slice(0, 3000)}`)
    .join('\n\n')

  const opsTable = (analysis.operationsWithPaths || [])
    .map(o => `${o.method} ${o.path} → ${o.name}()`)
    .join('\n') || '(not extracted)'

  const prompt = `Review this generated connector code against the API documentation.

Expected connector: "${analysis.connectorName}"
Expected base URL: "${analysis.baseUrl || '(not specified)'}"
Expected auth header: "${analysis.authHeaderName || '(not specified)'}"
Expected operations (method + path):
${opsTable}

Generated files:
${filesSummary.slice(0, 10000)}

Check ONLY these specific issues:
1. Is DEFAULT_BASE_URL set to the exact expected base URL?
2. Does API_PATHS use the exact paths from the expected operations (not invented slugs)?
3. Are all expected operations implemented as class methods?
4. Is the auth headerName correct?
5. Do POST/PUT operations have body parameters? Do GET/DELETE not have body params?

Respond with:
{
  "score": number (0-100),
  "needsFix": boolean,
  "issues": [{ "type": "wrong_base_url"|"wrong_path"|"missing_operation"|"wrong_auth_header"|"wrong_http_method"|"other", "file": string, "description": string, "fix": string }],
  "summary": string
}`

  try {
    const llm = getProvider()
    const raw = await llm.generate(REVIEWER_SYSTEM, prompt)
    return parseJson(raw)
  } catch {
    return heuristicReview(genResult, analysis)
  }
}

/**
 * Agent 2 — Code Fixer
 * Takes the review issues and fixes the generated files.
 * Returns updated genResult with corrected files.
 */
async function fixGenerated(genResult, reviewResult, docText, analysis) {
  if (!reviewResult.needsFix || !reviewResult.issues?.length) return genResult

  const filesToFix = Object.entries(genResult.files || {})
    .filter(([k]) => k !== 'registry_patch')

  const issueList = (reviewResult.issues || [])
    .map(i => `[${i.type}] ${i.file}: ${i.description} → Fix: ${i.fix}`)
    .join('\n')

  const opsTable = (analysis.operationsWithPaths || [])
    .map(o => `${o.method} ${o.path} → ${o.name}()`)
    .join('\n')

  const prompt = `Fix the following connector files to resolve these specific issues.

Connector: "${analysis.connectorName}"
Exact base URL to use: "${analysis.baseUrl || ''}"
Exact auth header to use: "${analysis.authHeaderName || 'X-Api-Key'}"
Exact operations to implement:
${opsTable}

Issues to fix:
${issueList}

Current file contents:
${filesToFix.map(([k, v]) => `// === ${k} ===\n${String(v).slice(0, 4000)}`).join('\n\n').slice(0, 12000)}

Return ONLY a JSON object with the fixed file keys (same keys as input, without registry_patch):
{
  "${genResult.className}.ts": "<corrected file content>",
  "types.ts": "<corrected or unchanged>",
  "constants.ts": "<corrected — use EXACT paths and base URL>",
  "parser.ts": "<corrected or unchanged>",
  "index.ts": "<corrected or unchanged>"
}`

  try {
    const llm = getProvider()
    const raw = await llm.generate(FIXER_SYSTEM, prompt)
    const fixed = parseJson(raw)
    // Merge fixed files back — only overwrite keys returned by fixer
    const updatedFiles = { ...genResult.files }
    for (const [key, content] of Object.entries(fixed)) {
      if (key !== 'registry_patch' && typeof content === 'string' && content.trim()) {
        updatedFiles[key] = content
      }
    }
    return { ...genResult, files: updatedFiles, _fixApplied: true }
  } catch {
    return genResult
  }
}

/**
 * Combined entry point: review then fix if needed.
 */
async function reviewAndFix(genResult, docText, analysis) {
  const reviewResult = await reviewGenerated(genResult, docText, analysis)
  if (!reviewResult.needsFix) return { genResult, reviewResult, fixed: false }

  const fixedGenResult = await fixGenerated(genResult, reviewResult, docText, analysis)
  return { genResult: fixedGenResult, reviewResult, fixed: true }
}

function heuristicReview(genResult, analysis) {
  const files = Object.values(genResult.files || {}).join('\n')
  const issues = []

  // Check base URL
  const expectedBase = analysis.baseUrl
  if (expectedBase && !files.includes(expectedBase)) {
    issues.push({ type: 'wrong_base_url', file: 'constants.ts', description: `DEFAULT_BASE_URL is not "${expectedBase}"`, fix: `Set DEFAULT_BASE_URL = '${expectedBase}'` })
  }

  // Check auth header
  const expectedHeader = analysis.authHeaderName
  if (expectedHeader && !files.includes(expectedHeader)) {
    issues.push({ type: 'wrong_auth_header', file: `${genResult.className}.ts`, description: `Auth headerName is not "${expectedHeader}"`, fix: `Set headerName: '${expectedHeader}'` })
  }

  // Check for invented paths (dasherized slugs)
  if (/API_PATHS\s*=\s*\{[^}]*'\/[a-z]+-[a-z]+-[a-z]+'/i.test(files)) {
    issues.push({ type: 'wrong_path', file: 'constants.ts', description: 'API paths look invented (slug format)', fix: 'Use exact paths from the API documentation' })
  }

  return {
    score:     issues.length ? 55 : 85,
    needsFix:  issues.length > 0,
    issues,
    summary:   issues.length ? 'Heuristic review found path/auth issues' : 'No obvious issues detected',
  }
}

function parseJson(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  try { return JSON.parse(cleaned) } catch {
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error('Code fixer returned non-JSON')
  }
}

module.exports = { reviewAndFix, reviewGenerated, fixGenerated }
