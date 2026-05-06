'use strict'
const { BaseSupervisor } = require('../../core/BaseSupervisor.cjs')

/**
 * Stage 8: Pull Request
 *
 * Child agents:
 *  1. CommitAgent   — stages and commits all connector files
 *  2. PushAgent     — pushes the branch to origin
 *  3. PRCreatorAgent — creates the GitHub pull request
 */
class PullRequestSupervisor extends BaseSupervisor {
  getStageId() { return 'pr' }

  getChildAgentDefs(task) {
    const { connectorId, connectorName, branch, reviewResult, analysis, dryRun = true, applyGit = false, createPr = false } = task

    return [
      {
        agentId:      'commit-agent',
        role:         'Git commit agent. Stage and commit all generated connector files.',
        allowedTools: ['git.commit'],
        retryLimit:   2,
        task: `Commit all generated files for connector "${connectorName}" (id: "${connectorId}").
Call git.commit with {
  branch: "${branch}",
  connectorName: "${connectorName}",
  dryRun: ${dryRun},
  applyGit: ${applyGit}
}.
Return { "committed": bool, "commitSha": "...", "filesCommitted": number, "message": "..." }`,
      },
      {
        agentId:      'push-agent',
        role:         'Git push agent. Push the feature branch to remote origin.',
        allowedTools: ['git.push'],
        retryLimit:   2,
        task: `Push branch "${branch}" to remote origin for connector "${connectorName}".
Read commit result from memory key "result:commit-agent".
If committed=false, skip push and return { "pushed": false, "reason": "nothing committed" }.
Otherwise call git.push with { branch: "${branch}", dryRun: ${dryRun}, applyGit: ${applyGit} }.
Return { "pushed": bool, "remote": "origin", "branch": "${branch}" }`,
      },
      {
        agentId:      'pr-creator',
        role:         'Pull request creator. Open a GitHub PR for the connector branch.',
        allowedTools: ['git.createPR'],
        retryLimit:   1,
        task: `Create a pull request for connector "${connectorName}" on branch "${branch}".
Read push result from memory key "result:push-agent".
If pushed=false and dryRun=${dryRun}, return { "prUrl": null, "skipped": true, "reason": "dry-run or not pushed" }.
${createPr ? `Call git.createPR with {
  branch: "${branch}",
  connectorName: "${connectorName}",
  mode: "${analysis?.mode || 'create'}",
  reviewScore: ${reviewResult?.score || 0},
  verdict: "${reviewResult?.verdict || 'APPROVED'}",
  dryRun: ${dryRun},
  createPr: true
}.` : `Skip PR creation (createPr=false). Return { "prUrl": null, "skipped": true, "reason": "createPr disabled" }.`}
Return { "prUrl": "...", "prNumber": number, "skipped": bool }`,
      },
    ]
  }

  interpretResults(validatedOutputs, task) {
    const commit  = validatedOutputs.find(r => r.agentId === 'commit-agent')?.output?.result  || {}
    const push    = validatedOutputs.find(r => r.agentId === 'push-agent')?.output?.result    || {}
    const prAgent = validatedOutputs.find(r => r.agentId === 'pr-creator')?.output?.result    || {}

    const commitFailed = validatedOutputs.find(r => r.agentId === 'commit-agent')?.output?.status === 'failed'
    if (commitFailed && task.applyGit) {
      return {
        status:     'failed',
        nextAction: 'escalate',
        reason:     'Git commit failed',
        output:     { committed: false },
        feedback:   {},
      }
    }

    return {
      status:     'success',
      nextAction: 'continue',
      output: {
        committed:      commit.committed    || false,
        commitSha:      commit.commitSha    || null,
        pushed:         push.pushed         || false,
        prUrl:          prAgent.prUrl       || null,
        prNumber:       prAgent.prNumber    || null,
        skipped:        prAgent.skipped     || !task.createPr,
        branch:         task.branch,
      },
      feedback: {},
    }
  }
}

module.exports = { PullRequestSupervisor }
