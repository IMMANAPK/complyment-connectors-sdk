import { test } from '@playwright/test'
import { assertSuccess, fillCredentials, loadPlayground, runOperation, selectConnector } from './helpers'

// Playwright compiles tests to CommonJS so require() is available here
// eslint-disable-next-line @typescript-eslint/no-require-imports
const registry: Record<string, any> = require('../../../playground/connectors.registry.cjs')

// "apiToken" → "API_TOKEN", "baseUrl" → "BASE_URL"
function toSnake(camel: string): string {
  return camel.replace(/([A-Z])/g, '_$1').toUpperCase()
}

// qualys + baseUrl → QUALYS_BASE_URL,  tenable-io + accessKey → TENABLE_IO_ACCESS_KEY
function envVarName(connectorId: string, fieldKey: string): string {
  const prefix = connectorId.toUpperCase().replace(/-/g, '_')
  return `${prefix}_${toSnake(fieldKey)}`
}

// Only run read-only ops — skip create/update/delete/install/publish etc.
const READ_PREFIXES = /^(get|list|fetch|search|getNormalized|getCritical|getMissing)/

function safeOps(def: any): string[] {
  return Object.keys(def.opsConfig || {})
    .filter(op => {
      if (op === 'testConnection' || !READ_PREFIXES.test(op)) return false
      // Skip ops whose args have empty/zero defaults — they need real IDs
      // and belong in the full connector test suite, not the generic one
      const cfg = def.opsConfig[op]
      if (cfg?.args?.length && cfg?.params) {
        const hasEmptyArg = cfg.args.some((arg: string) => {
          const val = cfg.params[arg]
          return val === '' || val === 0 || val == null
        })
        if (hasEmptyArg) return false
      }
      return true
    })
    .slice(0, 4)
}

// ── Dynamic test generation ───────────────────────────────────────────────────
// One describe block per connector in the registry.
// If any required credential env var is missing → entire block is skipped.
// Adding a new connector to connectors.registry.cjs automatically gives it tests here.

for (const [id, def] of Object.entries(registry)) {
  const fields: Array<{ key: string; required?: boolean }> = def.fields || []

  const creds: Record<string, string> = {}
  const missing: string[] = []

  for (const field of fields) {
    const envVar = envVarName(id, field.key)
    const value  = process.env[envVar] ?? ''
    if (field.required && !value) missing.push(envVar)
    creds[field.key] = value
  }

  const hasAllCreds = missing.length === 0
  const skipReason  = `Set ${missing.join(', ')} in .env.e2e`

  test.describe(`${def.label} — real API`, () => {
    test.skip(!hasAllCreds, skipReason)

    test.beforeEach(async ({ page }) => {
      await loadPlayground(page)
      await selectConnector(page, id)
      await fillCredentials(page, creds)
    })

    test('testConnection succeeds', async ({ page }) => {
      await runOperation(page, 'testConnection')
      await assertSuccess(page)
    })

    for (const opId of safeOps(def)) {
      test(`${opId} returns data`, async ({ page }) => {
        await runOperation(page, opId)
        await assertSuccess(page)
      })
    }
  })
}
