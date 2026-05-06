'use strict'
const { BaseSupervisor } = require('../../core/BaseSupervisor.cjs')

/**
 * Stage 7: Code Review
 *
 * Child agents (parallel — independent reviewers):
 *  1. StaticAnalyzerAgent    — reviews code structure, patterns, completeness
 *  2. SecurityReviewerAgent  — checks for hardcoded secrets, injection risks
 *  3. ScorerAgent            — aggregates all reviews into final score + verdict
 *
 * Cross-stage feedback: pushes review issues upstream to codegen if REJECTED.
 */
class ReviewSupervisor extends BaseSupervisor {
  getStageId() { return 'review' }

  getChildAgentDefs(task) {
    const { genResult } = task
    const fileList = Object.keys(genResult?.files || {}).join(', ')

    return [
      {
        agentId:      'static-analyzer',
        role:         'Code structure reviewer. Analyze TypeScript connector files for quality, completeness, and SDK pattern compliance.',
        allowedTools: ['llm.review', 'file.readFile'],
        retryLimit:   1,
        parallel:     true,
        task: `Review the generated connector code for quality and completeness.
Files: ${fileList}
Use llm.review with the genResult from memory key "result:file-writer" or use file.readFile to read individual files.
Check: proper method signatures, error handling, correct use of BaseConnector methods, complete operation coverage.
Return { "issues": [{ "severity": "error|warning|info", "file": "...", "message": "..." }], "score": 0-100 }`,
      },
      {
        agentId:      'security-reviewer',
        role:         'Security reviewer. Check for hardcoded credentials, injection risks, and insecure patterns.',
        allowedTools: ['llm.generate', 'file.readFile'],
        retryLimit:   1,
        parallel:     true,
        task: `Security review the generated connector files.
Files: ${fileList}
Read each file and check for: hardcoded API keys/passwords, SQL/command injection risks, insecure HTTP (not HTTPS), missing input validation.
Return { "securityIssues": [{ "severity": "critical|high|medium|low", "file": "...", "message": "..." }], "secure": bool }`,
      },
      {
        agentId:      'scorer',
        role:         'Final scorer. Aggregate all review results into a final score and verdict.',
        allowedTools: ['llm.generate'],
        retryLimit:   1,
        task: `Aggregate all review results.
Read from memory:
  - "result:static-analyzer" → code quality issues and score
  - "result:security-reviewer" → security issues

Combine them and produce a final verdict:
  - APPROVED: score >= 70, no critical security issues
  - WARN:     score 50-69, or has warnings
  - REJECTED: score < 50, or has critical issues

Return { "score": 0-100, "verdict": "APPROVED|WARN|REJECTED", "issues": [...all issues...], "summary": "..." }`,
      },
    ]
  }

  interpretResults(validatedOutputs) {
    const scorer   = validatedOutputs.find(r => r.agentId === 'scorer')?.output?.result          || {}
    const security = validatedOutputs.find(r => r.agentId === 'security-reviewer')?.output?.result || {}
    const static_  = validatedOutputs.find(r => r.agentId === 'static-analyzer')?.output?.result  || {}

    const verdict  = scorer.verdict || 'WARN'
    const score    = scorer.score   || static_.score || 60
    const issues   = scorer.issues  || []
    const rejected = verdict === 'REJECTED'

    return {
      status:     rejected ? 'needs_retry' : 'success',
      nextAction: rejected ? 'retry' : 'continue',
      reason:     rejected ? `Review REJECTED (score ${score}/100)` : undefined,
      output: {
        score,
        verdict,
        issues,
        summary:        scorer.summary  || '',
        securityPassed: security.secure !== false,
      },
      // Push upstream to codegen if rejected (Gap #7)
      feedback: rejected ? {
        codegen: {
          reviewIssues: issues.filter(i => i.severity !== 'info').map(i => `[${i.severity}] ${i.file}: ${i.message}`),
          message:      `Code review REJECTED (score ${score}/100) — fix these issues before next generation`,
        },
      } : {},
    }
  }
}

module.exports = { ReviewSupervisor }
