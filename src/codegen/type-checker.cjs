'use strict'
const { execSync } = require('child_process')
const { getProvider } = require('./providers/factory.cjs')
const { writeFiles } = require('./code-generator.cjs')

const FIX_SYSTEM = `You are a TypeScript expert fixing type errors in a connector SDK.
Respond with ONLY valid JSON — same shape as the files object you receive, with fixes applied.`

// Runs tsc --noEmit and returns { passed, errors }
function runTypecheck(cwd = process.cwd()) {
  try {
    execSync('npx tsc --noEmit', { cwd, encoding: 'utf8', stdio: 'pipe' })
    return { passed: true, errors: [] }
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '')
    const errors = output.split('\n').filter(l => l.includes('error TS')).slice(0, 30)
    return { passed: false, errors }
  }
}

// Self-correction: up to maxRetries attempts to fix TS errors
async function typecheckWithFix(generatorResult, rootDir = process.cwd(), maxRetries = 2) {
  if (generatorResult?.dryRun) {
    return { passed: true, attempts: 0, skipped: true, summary: 'Skipped in dry-run mode' }
  }
  let result = generatorResult
  let attempt = 0

  while (attempt <= maxRetries) {
    const check = runTypecheck(rootDir)
    if (check.passed) return { passed: true, attempts: attempt, result }

    if (attempt === maxRetries) return { passed: false, attempts: attempt, errors: check.errors, result }

    let fixed
    try {
      const llm = getProvider()
      fixed = await llm.generate(FIX_SYSTEM,
        `Fix these TypeScript errors in the connector files.\n\nErrors:\n${check.errors.join('\n')}\n\nCurrent files:\n${JSON.stringify(result.files, null, 2)}\n\nReturn the corrected files JSON.`)
    } catch {
      return { passed: false, attempts: attempt, errors: check.errors, result, skippedFix: true }
    }

    try {
      result = { ...result, files: parseJson(fixed) }
      writeFiles(result, rootDir, { dryRun: false })
    } catch {
      // If fix output is unparseable, continue to next attempt
    }
    attempt++
  }
}

function parseJson(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  try { return JSON.parse(cleaned) } catch {
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error('Could not parse fix output')
  }
}

module.exports = { runTypecheck, typecheckWithFix }
