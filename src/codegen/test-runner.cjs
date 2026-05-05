'use strict'
const { execSync } = require('child_process')
const { getProvider } = require('./providers/factory.cjs')

const FIX_SYSTEM = `You are a TypeScript SDK test engineer.
Fix the failing Playwright test or connector code based on error output.
Respond with ONLY valid JSON with two keys: "testFix" (updated test content) and "connectorFix" (updated connector content, or null if unchanged).`

// Runs the connector test suite for a specific connector
function runTests(connectorId, cwd = process.cwd()) {
  try {
    const out = execSync(`npx playwright test --grep "${connectorId}"`, {
      cwd, encoding: 'utf8', stdio: 'pipe', timeout: 120_000,
    })
    const passed = (out.match(/\d+ passed/) || [])[0] || '0 passed'
    const failed = (out.match(/\d+ failed/) || [])[0] || null
    return { passed: true, summary: `${passed}${failed ? ', ' + failed : ''}`, output: out }
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '')
    const failed = (output.match(/\d+ failed/) || [])[0] || 'tests failed'
    return { passed: false, summary: failed, output: output.slice(0, 3000) }
  }
}

// AI fix loop: attempt to repair failing tests
async function runTestsWithFix(connectorId, generatorResult, rootDir = process.cwd(), maxRetries = 2) {
  if (generatorResult?.dryRun) {
    return { passed: true, attempts: 0, skipped: true, summary: 'Skipped in dry-run mode' }
  }
  let attempt = 0
  while (attempt <= maxRetries) {
    const result = runTests(connectorId, rootDir)
    if (result.passed) return { passed: true, attempts: attempt, summary: result.summary }

    if (attempt === maxRetries) return { passed: false, attempts: attempt, summary: result.summary, error: result.output }

    let fix
    try {
      const llm = getProvider()
      fix = await llm.generate(FIX_SYSTEM,
        `Fix these test failures for connector "${connectorId}".\n\nTest output:\n${result.output}\n\nConnector class (${generatorResult.className}.ts):\n${generatorResult.files[generatorResult.className + '.ts'] || ''}`)
    } catch {
      return { passed: false, attempts: attempt, summary: result.summary, error: result.output, skippedFix: true }
    }

    try {
      const parsed = parseJson(fix)
      if (parsed.testFix) {
        const fs = require('fs'), path = require('path')
        const testPath = path.join(rootDir, 'tests', `${connectorId}.spec.ts`)
        if (fs.existsSync(testPath)) fs.writeFileSync(testPath, parsed.testFix)
      }
    } catch { /* continue */ }

    attempt++
  }
}

function parseJson(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  try { return JSON.parse(cleaned) } catch {
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error('Could not parse test fix')
  }
}

module.exports = { runTests, runTestsWithFix }
