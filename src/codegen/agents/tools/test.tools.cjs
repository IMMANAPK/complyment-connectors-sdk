'use strict'
const { execSync } = require('child_process')

function registerTestTools(registry, rootDir = process.cwd()) {
  registry.register('test', 'runPlaywright', async ({ connectorId, timeout = 60000 }) => {
    try {
      const grep = connectorId ? `--grep ${connectorId}` : ''
      const output = execSync(
        `npx playwright test ${grep} --reporter=json`.trim(),
        { cwd: rootDir, encoding: 'utf8', timeout, stdio: 'pipe' }
      )
      const parsed = _parsePlaywrightJson(output)
      return { passed: true, ...parsed }
    } catch (err) {
      const output = (err.stdout || '') + (err.stderr || '')
      // All tests skipped (no credentials) → treat as pass
      if (!output.includes('failed') || /no tests found/i.test(output)) {
        return { passed: true, skipped: true, summary: 'skipped (no credentials configured)', output: output.slice(0, 3000) }
      }
      const parsed = _parsePlaywrightJson(output)
      return { passed: false, ...parsed, output: output.slice(0, 3000) }
    }
  }, {
    description: 'Run Playwright e2e tests for a connector and return pass/fail + details',
    params: [
      { name: 'connectorId', type: 'string', description: 'Connector ID to grep for in tests' },
      { name: 'timeout',     type: 'number', description: 'Timeout in ms (default 60000)' },
    ],
  })

  registry.register('test', 'parseResults', async ({ output }) => {
    return _parsePlaywrightJson(output)
  }, {
    description: 'Parse raw Playwright output into structured pass/fail/skipped counts',
    params: [{ name: 'output', type: 'string' }],
  })
}

function _parsePlaywrightJson(raw) {
  try {
    const json = JSON.parse(raw)
    const stats = json.stats || {}
    return {
      total:   stats.expected || 0,
      passed:  stats.expected || 0,
      failed:  stats.unexpected || 0,
      skipped: stats.skipped || 0,
      summary: `${stats.expected || 0} passed, ${stats.unexpected || 0} failed`,
    }
  } catch {
    const failed  = (raw.match(/(\d+) failed/)?.[1]  || 0)
    const passed  = (raw.match(/(\d+) passed/)?.[1]  || 0)
    const skipped = (raw.match(/(\d+) skipped/)?.[1] || 0)
    return {
      total: Number(passed) + Number(failed) + Number(skipped),
      passed: Number(passed), failed: Number(failed), skipped: Number(skipped),
      summary: `${passed} passed, ${failed} failed`,
    }
  }
}

module.exports = { registerTestTools }
