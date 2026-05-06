'use strict'
const { BaseSupervisor } = require('../../core/BaseSupervisor.cjs')

/**
 * Stage 2: Branch Management
 *
 * Child agents:
 *  1. BranchCheckerAgent  — checks if branch exists, creates or checks out
 *  2. ConflictAgent       — detects merge conflicts or existing connector files
 */
class BranchSupervisor extends BaseSupervisor {
  getStageId() { return 'branch' }

  getChildAgentDefs(task) {
    const { connectorId, dryRun = true, applyGit = false } = task
    return [
      {
        agentId:      'branch-checker',
        role:         'Git branch manager. Create or check out the feature branch for this connector.',
        allowedTools: ['git.branch'],
        retryLimit:   2,
        task: `Manage the git branch for connector "${connectorId}".
Call git.branch with { connectorId: "${connectorId}", dryRun: ${dryRun}, applyGit: ${applyGit} }.
Return the full result as your result object.`,
      },
      {
        agentId:      'conflict-detector',
        role:         'Conflict detector. Check if existing connector files are present that might conflict.',
        allowedTools: ['file.listFiles', 'file.fileExists'],
        retryLimit:   1,
        parallel:     true,
        task: `Check if connector "${connectorId}" already has files on disk.
Call file.listFiles with { dir: "src/connectors/${connectorId}" }.
Return { "exists": bool, "fileCount": number, "files": [...] }`,
      },
    ]
  }

  interpretResults(validatedOutputs) {
    const branchResult   = validatedOutputs.find(r => r.agentId === 'branch-checker')?.output?.result || {}
    const conflictResult = validatedOutputs.find(r => r.agentId === 'conflict-detector')?.output?.result || {}

    const failed = validatedOutputs.some(r => r.output.status === 'failed')
    if (failed && validatedOutputs.find(r => r.agentId === 'branch-checker')?.output?.status === 'failed') {
      return { status: 'failed', nextAction: 'retry', reason: 'Branch creation failed', output: {}, feedback: {} }
    }

    return {
      status:     'success',
      nextAction: 'continue',
      output: {
        branch:       branchResult.branch,
        action:       branchResult.action,
        hadConflicts: branchResult.hadConflicts || false,
        existingFiles: conflictResult.files || [],
      },
      feedback: {},
    }
  }
}

module.exports = { BranchSupervisor }
