'use strict'

// Checks environment for required tokens/keys before the pipeline runs.
// Returns { ok: boolean, warnings: string[], errors: string[] }
function preflight(options = {}) {
  const warnings = []
  const errors   = []

  // Git operations need GITHUB_TOKEN
  if (options.applyGit || options.createPr) {
    const hasToken = !!(process.env.GITHUB_TOKEN || process.env.GH_TOKEN)
    if (!hasToken) {
      errors.push(
        'GITHUB_TOKEN (or GH_TOKEN) is not set. ' +
        'Git push and PR creation will fail. ' +
        'Set the env var or run with --dry-run to preview without committing.'
      )
    }
  }

  // Warn if no AI provider is configured — pipeline will fall back to heuristic
  const hasAI =
    process.env.ANTHROPIC_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.OPENAI_API_KEY

  if (!hasAI) {
    warnings.push(
      'No AI API key found (ANTHROPIC_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY). ' +
      'Pipeline will use the heuristic fallback — generated code quality will be lower.'
    )
  }

  return { ok: errors.length === 0, warnings, errors }
}

// Prints preflight results to stderr and throws if errors exist.
function assertPreflight(options = {}) {
  const { ok, warnings, errors } = preflight(options)

  for (const w of warnings) process.stderr.write(`[preflight warn] ${w}\n`)
  for (const e of errors)   process.stderr.write(`[preflight error] ${e}\n`)

  if (!ok) throw new Error(`Preflight failed: ${errors.join('; ')}`)
}

module.exports = { preflight, assertPreflight }
