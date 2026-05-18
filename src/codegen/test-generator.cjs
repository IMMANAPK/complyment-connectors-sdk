'use strict'
const fs   = require('fs')
const path = require('path')
const { getProvider } = require('./providers/factory.cjs')

const SYSTEM = `You are a Playwright e2e test engineer for the Complyment Connectors SDK.
Generate a complete Playwright test spec for a connector following the exact patterns used in the SDK.
Always respond with ONLY the raw TypeScript file content — no markdown fences, no explanation.`

/**
 * Generate a Playwright spec file for the connector and write it to disk.
 * Always writes — even if credentials are missing at runtime the test.skip
 * guard inside the file handles that gracefully.
 */
async function generateTestScript(genResult, analysis, rootDir = process.cwd()) {
  const { className, connectorId } = genResult
  const specPath = path.join(rootDir, 'tests', 'e2e', 'connectors', `${connectorId}.spec.ts`)

  // Parse credential fields from the Config interface in types.ts
  const credFields = extractCredFields(genResult.files['types.ts'] || '', analysis)

  // Try LLM generation first
  let specContent
  try {
    specContent = await llmGenerateSpec(genResult, analysis, credFields)
  } catch {
    specContent = null
  }

  // Validate — must look like a real spec
  if (!specContent || !specContent.includes('test.describe') || !specContent.includes('test.skip')) {
    specContent = heuristicSpec(connectorId, className, analysis, credFields)
  }

  fs.mkdirSync(path.dirname(specPath), { recursive: true })
  fs.writeFileSync(specPath, specContent, 'utf8')

  return { specPath, credFields, generated: true }
}

async function llmGenerateSpec(genResult, analysis, credFields) {
  const { className, connectorId } = genResult
  const ops = analysis.operationsWithPaths || []
  const opsTable = ops.map(o => `  ${o.method.padEnd(6)} ${o.path.padEnd(40)} → ${o.name}()`).join('\n')

  const credEnvVars = credFields
    .map(f => `  ${f.key}: process.env.${toEnvVar(connectorId, f.key)} ?? '',`)
    .join('\n')

  const credEnvVarNames = credFields.map(f => toEnvVar(connectorId, f.key)).join(', ')

  const connectorClassSnippet = (genResult.files[`${className}.ts`] || '').slice(0, 2000)

  const prompt = `Generate a complete Playwright e2e test spec for the "${analysis.connectorName}" connector.

Connector details:
- connectorId: "${connectorId}"
- className: "${className}"
- Auth type: ${analysis.authType}
- Auth header: ${analysis.authHeaderName || ''}
- Base URL: ${analysis.baseUrl || ''}

Credential fields (from Config interface):
${credFields.map(f => `  ${f.key}${f.required ? ' (required)' : ' (optional)'}`).join('\n')}

Env var names for .env.e2e:
${credEnvVarNames}

Operations to test (method + path → method name):
${opsTable}

Connector class (first 2000 chars):
${connectorClassSnippet}

RULES you MUST follow:
1. Import from './helpers': { assertSuccess, fillCredentials, loadPlayground, runOperation, runWithParams, selectConnector, getResponseData }
2. Credential block pattern:
   const creds = {
${credEnvVars}
   }
   const hasCredentials = Object.values(creds).every(Boolean)

3. ALWAYS use test.skip inside the describe block:
   test.skip(!hasCredentials, 'Set ${credEnvVarNames} in .env.e2e')

4. test.beforeEach must call: loadPlayground, selectConnector(page, '${connectorId}'), fillCredentials(page, creds)

5. First test is always 'testConnection'
6. For GET operations without path params: use runOperation(page, 'opName')
7. For GET operations with path params (like getFileReport, getDomainReport): use runWithParams with a realistic placeholder value (e.g. a real hash, domain, IP)
8. For POST operations (scanUrl, uploadFile, addComment): test with minimal realistic params
9. Mark write/delete operations with a comment: // ── write operation
10. Number tests: 01 · testConnection, 02 · opName, etc.
11. Use test.describe('${analysis.connectorName} — full API suite', ...) as the outer block

Output ONLY the raw TypeScript — no markdown, no \`\`\`ts fences.`

  const llm = getProvider()
  const raw = await llm.generate(SYSTEM, prompt)

  // Strip markdown fences if LLM added them
  return raw.replace(/^```(?:typescript|ts)?\n?/m, '').replace(/```\s*$/m, '').trim()
}

function heuristicSpec(connectorId, className, analysis, credFields) {
  const ops = analysis.operationsWithPaths || []
  const credEnvVarNames = credFields.map(f => toEnvVar(connectorId, f.key)).join(', ')
  const skipMsg = credFields.length
    ? `Set ${credEnvVarNames} in .env.e2e`
    : `Set credentials in .env.e2e`

  const credBlock = credFields
    .map(f => `  ${f.key}: process.env.${toEnvVar(connectorId, f.key)} ?? '',`)
    .join('\n')

  const tests = ops.map((op, i) => {
    const num = String(i + 2).padStart(2, '0')
    const pathParams = (op.path.match(/\{([^}]+)\}/g) || []).map(p => p.slice(1, -1))
    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(op.method)

    if (pathParams.length) {
      const params = Object.fromEntries(pathParams.map(p => [p, placeholderFor(p)]))
      return `
  test('${num} · ${op.name}', async ({ page }) => {${isWrite ? ' // ── write operation' : ''}
    await runWithParams(page, '${op.name}', ${JSON.stringify(params)})
    await assertSuccess(page)
  })`
    }

    if (isWrite) {
      return `
  test('${num} · ${op.name}', async ({ page }) => { // ── write operation
    // Provide required body params for ${op.method} ${op.path}
    await runWithParams(page, '${op.name}', {})
    await assertSuccess(page)
  })`
    }

    return `
  test('${num} · ${op.name}', async ({ page }) => {
    await runOperation(page, '${op.name}')
    await assertSuccess(page)
  })`
  }).join('\n')

  return `import { test } from '@playwright/test'
import {
  assertSuccess,
  fillCredentials,
  loadPlayground,
  runOperation,
  runWithParams,
  selectConnector,
} from './helpers'

// ── Credentials ───────────────────────────────────────────────────────────────
const creds = {
${credBlock || `  apiKey: process.env.${toEnvVar(connectorId, 'apiKey')} ?? '',`}
}
const hasCredentials = Object.values(creds).every(Boolean)

// ── Test Suite ────────────────────────────────────────────────────────────────
test.describe('${analysis.connectorName} — full API suite', () => {
  test.skip(!hasCredentials, '${skipMsg}')

  test.beforeEach(async ({ page }) => {
    await loadPlayground(page)
    await selectConnector(page, '${connectorId}')
    await fillCredentials(page, creds)
  })

  test('01 · testConnection', async ({ page }) => {
    await runOperation(page, 'testConnection')
    await assertSuccess(page)
  })
${tests}
})
`
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractCredFields(typesTs, analysis) {
  // Parse fields from Config interface in types.ts
  const fields = []
  const configMatch = typesTs.match(/interface\s+\w+Config\s*\{([^}]+)\}/s)
  if (configMatch) {
    const body = configMatch[1]
    const lines = body.split('\n').map(l => l.trim()).filter(Boolean)
    for (const line of lines) {
      const m = line.match(/^(\w+)(\??):\s*(\w+)/)
      if (!m) continue
      const key = m[1]
      const optional = m[2] === '?'
      // Skip non-credential utility fields
      if (['timeout', 'retries', 'dryRun', 'logger'].includes(key)) continue
      fields.push({ key, required: !optional })
    }
  }
  // Fallback: use auth type to infer fields
  if (!fields.length) {
    if (analysis.authType === 'basic') {
      fields.push({ key: 'username', required: true }, { key: 'password', required: true })
    } else if (['bearer', 'oauth2'].includes(analysis.authType)) {
      fields.push({ key: 'token', required: true })
    } else {
      fields.push({ key: 'apiKey', required: true })
    }
    if (analysis.baseUrl === '') {
      fields.push({ key: 'baseUrl', required: true })
    }
  }
  return fields
}

function toEnvVar(connectorId, fieldKey) {
  const prefix = connectorId.toUpperCase().replace(/-/g, '_')
  const suffix = fieldKey.replace(/([A-Z])/g, '_$1').toUpperCase()
  return `${prefix}_${suffix}`
}

function placeholderFor(paramName) {
  const n = paramName.toLowerCase()
  if (n === 'id' || n.endsWith('id'))       return 'test-id-placeholder'
  if (n === 'domain')                        return 'example.com'
  if (n === 'ip')                            return '8.8.8.8'
  if (n.includes('hash') || n === 'sha256') return '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f'
  if (n.includes('url'))                     return 'https://example.com'
  if (n.includes('key'))                     return 'TEST-1'
  return `placeholder-${paramName}`
}

module.exports = { generateTestScript }
