'use strict'
const { BaseSupervisor } = require('../../core/BaseSupervisor.cjs')
const { BaseAgent }      = require('../../core/BaseAgent.cjs')

/**
 * Stage 1: Document Validation
 *
 * Child agents:
 *  1. TextExtractorAgent  — reads file/url and extracts raw text
 *  2. ApiAnalyzerAgent    — calls llm.analyze on the extracted text
 *  3. QualityCheckerAgent — validates analysis completeness, sets verdict
 */
class DocumentValidationSupervisor extends BaseSupervisor {
  getStageId() { return 'validate' }

  getChildAgentDefs(task, feedback = [], attempt = 0) {
    const feedbackNote = feedback.length
      ? `\nCross-stage feedback: ${feedback.map(f => JSON.stringify(f.feedback)).join('; ')}`
      : ''

    return [
      {
        agentId:      'text-extractor',
        role:         'API document text extractor. Your job is to read the source (file path, URL, or raw text) and return the full document text.',
        allowedTools: ['file.readFile', 'file.fileExists'],
        retryLimit:   2,
        task:         `Extract text from this API document source.\n${JSON.stringify(task)}\n${feedbackNote}\nReturn the full text in your result as { "docText": "<full text>" }`,
      },
      {
        agentId:      'api-analyzer',
        role:         'API documentation analyzer. Read extracted document text from memory key "result:text-extractor" and analyze it using the llm.analyze tool.',
        allowedTools: ['llm.analyze'],
        retryLimit:   2,
        task:         `Analyze the extracted API document. Read the text from memory key "result:text-extractor" (field result.docText), then call llm.analyze. Return the analysis as your result.${feedbackNote}`,
      },
      {
        agentId:      'quality-checker',
        role:         'API document quality checker. Validate the analysis from memory and determine final verdict.',
        allowedTools: ['llm.generate'],
        retryLimit:   1,
        task:         `Review the API analysis stored in memory key "result:api-analyzer". Check: does it have connectorName, authType, operationsFound (>0)? Set verdict PASS/WARN/FAIL. Return { "verdict": "PASS"|"WARN"|"FAIL", "reason": "...", "analysis": <full analysis object> }.${feedbackNote}`,
      },
    ]
  }

  interpretResults(validatedOutputs) {
    const extractor = validatedOutputs.find(r => r.agentId === 'text-extractor')
    const analyzer  = validatedOutputs.find(r => r.agentId === 'api-analyzer')
    const checker   = validatedOutputs.find(r => r.agentId === 'quality-checker')

    const anyFailed = validatedOutputs.some(r => r.output.status === 'failed')
    const verdict   = checker?.output?.result?.verdict || analyzer?.output?.result?.verdict || 'FAIL'

    if (anyFailed || verdict === 'FAIL' || verdict === 'REJECT') {
      const reason = checker?.output?.result?.reason || analyzer?.output?.result?.reason || 'Document rejected'
      return {
        status:     'failed',
        nextAction: 'escalate',
        reason,
        output:     { verdict, reason },
        feedback:   {},
      }
    }

    // Merge analysis from analyzer and checker
    const analysis = checker?.output?.result?.analysis
      || analyzer?.output?.result
      || {}

    return {
      status:     'success',
      nextAction: 'continue',
      output:     { analysis, verdict, docText: extractor?.output?.result?.docText || '' },
      feedback:   {},
    }
  }
}

module.exports = { DocumentValidationSupervisor }
