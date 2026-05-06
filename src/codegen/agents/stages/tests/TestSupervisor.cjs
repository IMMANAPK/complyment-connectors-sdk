'use strict'
const { BaseSupervisor } = require('../../core/BaseSupervisor.cjs')

/**
 * Stage 6: Playwright Tests
 *
 * Child agents:
 *  1. TestRunnerAgent   — runs Playwright tests for the connector
 *  2. TestFixerAgent    — if tests fail, uses LLM to fix connector or test code
 *  3. TestVerifierAgent — re-runs tests to confirm fix (parallel safe after fixer)
 *
 * Cross-stage feedback: pushes test errors upstream to codegen if fix fails.
 */
class TestSupervisor extends BaseSupervisor {
  getStageId() { return 'tests' }

  getChildAgentDefs(task, feedback = [], attempt = 0) {
    const { connectorId, genResult } = task
    const fbNote = feedback.length
      ? `\nCross-stage feedback: ${feedback.map(f => JSON.stringify(f.feedback)).join('\n')}`
      : ''

    return [
      {
        agentId:      'test-runner',
        role:         'Playwright test runner. Run e2e tests for the connector and report results.',
        allowedTools: ['test.runPlaywright'],
        retryLimit:   1,
        task: `Run Playwright tests for connector "${connectorId}".
Call test.runPlaywright with { connectorId: "${connectorId}" }.
Return the full result including passed, failed, skipped counts and summary.${fbNote}`,
      },
      {
        agentId:      'test-fixer',
        role:         'Test failure fixer. Analyze failing tests and fix connector or test code.',
        allowedTools: ['llm.generate', 'llm.parseJson', 'file.readFile', 'file.writeFile', 'code.applyPatch'],
        retryLimit:   2,
        task: `Read test results from memory key "result:test-runner".
If passed=true or skipped=true, return { "fixed": false, "reason": "tests passed or skipped" }.
If tests failed:
1. Read relevant connector files from src/connectors/${connectorId}/
2. Use llm.generate to diagnose and fix the failing test logic or connector code
3. Write fixed files using code.applyPatch
Return { "fixed": bool, "filesPatched": [...], "summary": "what was fixed" }`,
      },
      {
        agentId:      'test-verifier',
        role:         'Test verifier. Re-run tests after fixes to confirm they pass.',
        allowedTools: ['test.runPlaywright'],
        retryLimit:   1,
        task: `Re-run Playwright tests for connector "${connectorId}" to verify fixes worked.
Call test.runPlaywright with { connectorId: "${connectorId}" }.
Return { "passed": bool, "summary": "..." }`,
      },
    ]
  }

  interpretResults(validatedOutputs, task) {
    const runner   = validatedOutputs.find(r => r.agentId === 'test-runner')?.output?.result   || {}
    const fixer    = validatedOutputs.find(r => r.agentId === 'test-fixer')?.output?.result    || {}
    const verifier = validatedOutputs.find(r => r.agentId === 'test-verifier')?.output?.result || {}

    const initiallyPassed = runner.passed  || runner.skipped
    const finallyPassed   = verifier.passed || verifier.skipped || initiallyPassed

    if (finallyPassed) {
      return {
        status:     'success',
        nextAction: 'continue',
        output: {
          passed:          true,
          skipped:         runner.skipped || verifier.skipped || false,
          summary:         verifier.summary || runner.summary || 'Tests passed',
          connectorFiles:  fixer.filesPatched || [],
        },
        feedback: {},
      }
    }

    // Tests still failing — push feedback upstream to codegen (Gap #7)
    const errors = [runner.summary, verifier.summary].filter(Boolean)
    return {
      status:     'failed',
      nextAction: 'retry',
      reason:     `Tests still failing after fix attempt: ${errors.join(' | ')}`,
      output:     { passed: false, summary: errors.join(' | ') },
      feedback: {
        codegen: {
          testErrors: errors,
          message:    'Tests failed — regenerate connector with these errors in mind',
        },
      },
    }
  }
}

module.exports = { TestSupervisor }
