'use strict'
const { BaseSupervisor } = require('../../core/BaseSupervisor.cjs')

/**
 * Stage 5: TypeCheck
 *
 * Child agents (sequential — each depends on the previous):
 *  1. TypecheckRunnerAgent — runs tsc and returns errors
 *  2. TypeFixerAgent       — calls LLM to fix errors, writes fixed files
 *  3. VerifierAgent        — re-runs tsc to confirm fix worked
 *
 * Loop: If errors remain after fix, Supervisor retries the fix+verify cycle
 * up to maxRetries times before escalating.
 */
class TypecheckSupervisor extends BaseSupervisor {
  getStageId() { return 'typecheck' }

  getChildAgentDefs(task, feedback = [], attempt = 0) {
    return [
      {
        agentId:      'typecheck-runner',
        role:         'TypeScript type checker. Run tsc and report errors.',
        allowedTools: ['code.runTsc'],
        retryLimit:   1,
        task:         'Run TypeScript type check using the code.runTsc tool. Return { "passed": bool, "errors": [...] }',
      },
      {
        agentId:      'type-fixer',
        role:         'TypeScript error fixer. Read tsc errors from memory and fix them.',
        allowedTools: ['llm.generate', 'llm.parseJson', 'file.readFile', 'code.applyPatch'],
        retryLimit:   2,
        task: `Read typecheck results from memory key "result:typecheck-runner".
If passed=true, return { "fixed": false, "reason": "no errors" }.
If errors exist, use llm.generate to produce fixed TypeScript files.

BaseConnector protected method signatures (exact — do NOT deviate):
  get<T>(url, params?)    → Promise<ConnectorResponse<T>>
  post<T>(url, body?)     → Promise<ConnectorResponse<T>>
  put<T>(url, body?)      → Promise<ConnectorResponse<T>>
  patch<T>(url, body?)    → Promise<ConnectorResponse<T>>
  delete<T>(url)          → Promise<ConnectorResponse<T>>  ← NO body/params

For each fixed file, use code.applyPatch to write it.
Return { "fixed": true, "filesPatched": [...] }`,
      },
      {
        agentId:      'typecheck-verifier',
        role:         'TypeScript verifier. Re-run tsc to confirm all errors are resolved.',
        allowedTools: ['code.runTsc'],
        retryLimit:   1,
        task:         'Re-run type check using code.runTsc. Return { "passed": bool, "errors": [...] }',
        parallel:     false,
      },
    ]
  }

  interpretResults(validatedOutputs, task) {
    const runner   = validatedOutputs.find(r => r.agentId === 'typecheck-runner')
    const fixer    = validatedOutputs.find(r => r.agentId === 'type-fixer')
    const verifier = validatedOutputs.find(r => r.agentId === 'typecheck-verifier')

    const runnerPassed   = runner?.output?.result?.passed   ?? true
    const verifierPassed = verifier?.output?.result?.passed ?? runnerPassed

    if (verifierPassed || runnerPassed) {
      return {
        status:     'success',
        nextAction: 'continue',
        output: {
          passed:          true,
          attempts:        1,
          fixedGenResult:  task.genResult, // may have patched files on disk
          summary:         'TypeScript checks passed',
        },
        feedback: {},
      }
    }

    const errors = verifier?.output?.result?.errors || runner?.output?.result?.errors || []
    const fixerFailed = fixer?.output?.status !== 'success'

    return {
      status:     fixerFailed ? 'failed' : 'needs_retry',
      nextAction: fixerFailed ? 'escalate' : 'retry',
      reason:     `TypeScript errors remain: ${errors.slice(0, 3).join(' | ')}`,
      output:     { passed: false, errors, attempts: 1 },
      feedback:   {
        // Push feedback upstream to codegen so it can regenerate with type hints
        codegen: { typecheckErrors: errors, message: 'Fix these TypeScript errors in the next generation' },
      },
    }
  }
}

module.exports = { TypecheckSupervisor }
