'use strict'
const { BaseSupervisor } = require('../../core/BaseSupervisor.cjs')

/**
 * Stage 3: Conflict / Mode Analysis
 *
 * Child agents:
 *  1. ChangelogAgent   — diffs existing files vs new analysis to detect breaking changes
 *  2. ModeDeciderAgent — decides create vs update mode based on existing files
 */
class AnalysisSupervisor extends BaseSupervisor {
  getStageId() { return 'conflict' }

  getChildAgentDefs(task) {
    const { connectorId, analysis, branchResult } = task
    return [
      {
        agentId:      'changelog-agent',
        role:         'Changelog generator. Compare existing connector files with the new API analysis and list what changed.',
        allowedTools: ['file.listFiles', 'file.readFile', 'llm.generate'],
        retryLimit:   2,
        task: `Detect changes for connector "${connectorId}".
1. Call file.listFiles with { dir: "src/connectors/${connectorId}" } to get existing files.
2. If files exist, read key ones (e.g. constants.ts) and compare with new operations: ${(analysis.operationsFound || []).join(', ')}.
3. Use llm.generate to produce a changelog: list added, removed, modified operations.
Return { "changes": [{ "type": "added|removed|modified|breaking", "description": "..." }], "hasBreaking": bool }`,
      },
      {
        agentId:      'mode-decider',
        role:         'Mode selector. Decide whether this is a "create" or "update" run.',
        allowedTools: ['file.fileExists'],
        retryLimit:   1,
        parallel:     true,
        task: `Determine the correct mode for connector "${connectorId}".
Call file.fileExists with { filePath: "src/connectors/${connectorId}" }.
If it exists → mode is "update". Otherwise → mode is "create".
Also consider branch action from memory key "result:branch-checker": ${JSON.stringify(branchResult || {})}.
Return { "mode": "create"|"update", "reason": "..." }`,
      },
    ]
  }

  interpretResults(validatedOutputs, task) {
    const changelog  = validatedOutputs.find(r => r.agentId === 'changelog-agent')?.output?.result || {}
    const modeResult = validatedOutputs.find(r => r.agentId === 'mode-decider')?.output?.result || {}

    return {
      status:     'success',
      nextAction: 'continue',
      output: {
        mode:          modeResult.mode || 'create',
        connectorId:   task.connectorId,
        hadConflicts:  task.branchResult?.hadConflicts || false,
        changelog:     changelog,
        hasBreaking:   changelog.hasBreaking || false,
      },
      feedback: {},
    }
  }
}

module.exports = { AnalysisSupervisor }
