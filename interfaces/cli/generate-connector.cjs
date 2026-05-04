#!/usr/bin/env node
'use strict'
const path = require('path')
const fs = require('fs')
const { run } = require('../../src/codegen/pipeline/orchestrator.cjs')
const { getProviderName } = require('../../src/codegen/providers/factory.cjs')
const { loadConfig } = require('../../src/codegen/config/config-loader.cjs')

const flags = parseFlags(process.argv.slice(2))

if (flags.help) {
  console.log(`
Usage:
  npm run generate -- --file ./api.yaml
  npm run generate -- --url "https://example.com/api-docs"
  npm run generate -- --text "CrowdStrike API, API key, Operations: getIncidents, getDevices"
  npm run generate:auto -- --file ./api.yaml
  npm run generate -- --resume crowdstrike

Options:
  --file <path>                API document path
  --url <url>                  Public API document URL, including published Notion pages
  --text <text>                Inline API description
  --resume <id>                Resume saved state from .connector-gen/<id>.json
  --mode create|update         Force generation mode
  --auto                       Disable HITL prompts
  --provider anthropic|gemini|openai|heuristic  Override AI provider (default: auto-detect from env)
  --dry-run                    Preview files/PR/notifications (default)
  --apply-git                  Actually write files and run git branch/commit/push
  --create-pr                  Actually call gh pr create (requires --apply-git)
  --notify                     Actually send configured SMTP email notifications
  --run-tests                  Run Playwright connector tests
  --root <dir>                 SDK root directory
`)
  process.exit(0)
}

const rootDir = flags.root ? path.resolve(flags.root) : process.cwd()
const docPath = flags.file || flags._[0] ? path.resolve(flags.file || flags._[0]) : null
const docUrl = flags.url ? String(flags.url) : null
const docText = flags.text ? String(flags.text) : null
const resume = flags.resume ? String(flags.resume) : null

if (!resume && !docText && !docPath && !docUrl) {
  console.error('Error: provide --file, --url, --text, or --resume. Use --help for examples.')
  process.exit(1)
}

if (docPath && !fs.existsSync(docPath)) {
  console.error(`Error: file not found: ${docPath}`)
  process.exit(1)
}

if (flags.provider) {
  const { setProvider } = require('../../src/codegen/providers/factory.cjs')
  setProvider(flags.provider)
}

const config = loadConfig(rootDir, flags)

// Validate environment before starting
const { assertPreflight } = require('../../src/codegen/preflight.cjs')
try {
  assertPreflight({ applyGit: config.applyGit, createPr: config.createPr })
} catch (err) {
  console.error(`\n${err.message}`)
  process.exit(1)
}

console.log(`\nComplyment Connector Generator`)
console.log(`Provider : ${getProviderName()}`)
console.log(`Input    : ${resume ? `resume ${resume}` : docUrl || docPath || 'inline text'}`)
console.log(`Mode     : ${flags.mode || 'auto-detect'}`)
console.log(`HITL     : ${config.mode === 'auto' ? 'auto' : 'interactive'}`)
console.log(`Dry run  : ${config.dryRun ? 'yes' : 'no'}\n`)

run({
  docPath,
  docUrl,
  docText,
  resume,
  rootDir,
  config,
  mode: flags.mode === 'create' || flags.mode === 'update' ? flags.mode : undefined,
  autoApprove: config.mode === 'auto',
})
  .then(output => {
    console.log(`\n✓ Pipeline complete [${output.runId}]`)
    if (output.pr?.url) console.log(`  PR: ${output.pr.url}`)
    else if (output.pr?.draftBody) console.log('  PR draft prepared (dry-run).')
    process.exit(0)
  })
  .catch(err => {
    console.error(`\n✗ Pipeline failed: ${err.message}`)
    process.exit(1)
  })

function parseFlags(argv) {
  const result = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      if (key.includes('=')) {
        const [k, v] = key.split(/=(.*)/, 2)
        result[k] = v
      } else {
        const next = argv[i + 1]
        if (next && !next.startsWith('--')) {
          result[key] = next
          i++
        } else {
          result[key] = true
        }
      }
    } else {
      result._.push(arg)
    }
  }
  return result
}
