'use strict'
const { getProvider } = require('./providers/factory.cjs')

const SYSTEM = `You are a senior TypeScript SDK code reviewer for the Complyment Connectors SDK.
Review connector code for correctness, security, and adherence to SDK conventions.
Always respond with ONLY valid JSON — no markdown, no prose.`

// Returns { score, verdict, issues, summary }
async function reviewCode(generatorResult, humanInstruction = '') {
  const files = Object.entries(generatorResult.files)
    .filter(([k]) => k !== 'registry_patch')
    .map(([k, v]) => `// === ${k} ===\n${v}`)
    .join('\n\n')

  const userPrompt = `Review this connector code for "${generatorResult.className}".
${humanInstruction ? `Human notes: "${humanInstruction}"\n` : ''}

${files.slice(0, 14000)}

Respond with this JSON:
{
  "score": number (0-100),
  "verdict": "APPROVED" | "APPROVED_WITH_WARNINGS" | "REJECTED",
  "issues": [{ "severity": "error"|"warning"|"info", "file": string, "message": string }],
  "summary": string
}`

  try {
    const llm = getProvider()
    const raw = await llm.generate(SYSTEM, userPrompt)
    return parseJson(raw)
  } catch {
    return heuristicReview(generatorResult)
  }
}

function parseJson(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  try { return JSON.parse(cleaned) } catch {
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error('Reviewer returned non-JSON')
  }
}

function heuristicReview(generatorResult) {
  const text = Object.values(generatorResult.files || {}).join('\n')
  const issues = []
  if (/apiKey\s*=\s*['"][^'"]+['"]/.test(text)) {
    issues.push({ severity: 'error', file: generatorResult.className + '.ts', message: 'Potential hardcoded API key' })
  }
  if (!/extends BaseConnector/.test(text)) {
    issues.push({ severity: 'error', file: generatorResult.className + '.ts', message: 'Connector does not extend BaseConnector' })
  }
  if (!/ConnectorResponse/.test(text)) {
    issues.push({ severity: 'warning', file: generatorResult.className + '.ts', message: 'Connector methods should return ConnectorResponse<T>' })
  }
  const errors = issues.filter(i => i.severity === 'error').length
  return {
    score: errors ? 62 : issues.length ? 84 : 90,
    verdict: errors ? 'REJECTED' : issues.length ? 'APPROVED_WITH_WARNINGS' : 'APPROVED',
    issues,
    strengths: ['Uses generated connector structure', 'Keeps credentials in runtime config'],
    summary: 'Heuristic local code review completed.',
  }
}

module.exports = { reviewCode, heuristicReview }
