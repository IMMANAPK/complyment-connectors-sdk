'use strict'
const { BaseSupervisor } = require('../../core/BaseSupervisor.cjs')

/**
 * Stage 9: Notification
 *
 * Child agents (parallel — independent channels):
 *  1. SlackNotifierAgent — posts summary to Slack (if configured)
 *  2. SummaryAgent       — builds a human-readable run summary
 */
class NotificationSupervisor extends BaseSupervisor {
  getStageId() { return 'notify' }

  getChildAgentDefs(task) {
    const {
      connectorName,
      prUrl,
      verdict       = 'APPROVED',
      score         = 0,
      dryRun        = true,
      sendNotifications = false,
    } = task

    return [
      {
        agentId:      'slack-notifier',
        role:         'Slack notification sender. Post a connector generation summary to the configured Slack channel.',
        allowedTools: ['llm.generate'],
        retryLimit:   1,
        parallel:     true,
        task: `Send a Slack notification for connector "${connectorName}".
${sendNotifications && !dryRun
  ? `Use llm.generate to format a Slack message:
  - Connector: ${connectorName}
  - PR URL: ${prUrl || 'N/A'}
  - Review verdict: ${verdict} (score: ${score}/100)
  Then return { "sent": true, "channel": "#connector-gen", "message": "<formatted message>" }.`
  : `Skip sending (sendNotifications=${sendNotifications}, dryRun=${dryRun}).
Return { "sent": false, "skipped": true, "reason": "notifications disabled or dry-run" }.`}`,
      },
      {
        agentId:      'summary-agent',
        role:         'Run summarizer. Produce a human-readable summary of the full connector generation run.',
        allowedTools: ['llm.generate'],
        retryLimit:   1,
        parallel:     true,
        task: `Produce a run summary for connector "${connectorName}".
Collect context from memory keys:
  - "result:static-analyzer"   → code quality score/issues
  - "result:security-reviewer" → security issues
  - "result:scorer"            → final verdict
  - "result:push-agent"        → git push result
  - "result:pr-creator"        → PR URL

Use llm.generate to write a concise 3-5 line summary covering:
  - What was generated
  - Review verdict and score
  - Any outstanding issues
  - PR link (if available: ${prUrl || 'not yet created'})

Return { "summary": "...", "connectorName": "${connectorName}", "prUrl": "${prUrl || ''}" }`,
      },
    ]
  }

  interpretResults(validatedOutputs, task) {
    const slack   = validatedOutputs.find(r => r.agentId === 'slack-notifier')?.output?.result || {}
    const summary = validatedOutputs.find(r => r.agentId === 'summary-agent')?.output?.result  || {}

    return {
      status:     'success',
      nextAction: 'done',
      output: {
        notified:     slack.sent || false,
        slackChannel: slack.channel || null,
        summary:      summary.summary || `Connector "${task.connectorName}" generated successfully.`,
        prUrl:        task.prUrl || null,
        connectorName: task.connectorName,
      },
      feedback: {},
    }
  }
}

module.exports = { NotificationSupervisor }
