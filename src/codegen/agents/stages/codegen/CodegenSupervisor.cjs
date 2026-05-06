'use strict'
const { BaseSupervisor } = require('../../core/BaseSupervisor.cjs')

/**
 * Stage 4: Code Generation
 *
 * Child agents:
 *  1. GeneratorAgent  — calls llm.generate to produce connector files
 *  2. FileWriterAgent — writes generated files to disk
 */
class CodegenSupervisor extends BaseSupervisor {
  getStageId() { return 'codegen' }

  getChildAgentDefs(task, feedback = [], attempt = 0) {
    const { analysis, docText, mode } = task
    const ops       = (analysis.operationsFound || []).join(', ')
    const fbNote    = feedback.length
      ? `\nReview/test feedback from previous run:\n${feedback.map(f => JSON.stringify(f.feedback)).join('\n')}`
      : ''

    return [
      {
        agentId:      'generator',
        role:         'TypeScript connector code generator for the Complyment Connectors SDK.',
        allowedTools: ['llm.generate', 'llm.parseJson'],
        retryLimit:   3,
        task: `Generate a complete ${mode === 'update' ? 'UPDATED' : 'NEW'} connector.

Connector: ${analysis.connectorName}
Auth: ${analysis.authType} (${analysis.authDetails || ''})
Base URL: ${analysis.baseUrl || '(user will configure)'}
Operations: ${ops}

API Documentation (first 8000 chars):
${String(docText || '').slice(0, 8000)}
${fbNote}

Use llm.generate to produce a JSON object with keys:
"<ClassName>.ts", "types.ts", "constants.ts", "parser.ts", "index.ts", "registry_patch"
Store the className in your result as { "className": "...", "files": { ... } }`,
      },
      {
        agentId:      'file-writer',
        role:         'File writer that saves generated connector files to disk.',
        allowedTools: ['file.writeFile', 'file.listFiles'],
        retryLimit:   2,
        task: `Write the generated connector files to disk.
Read the generator output from memory key "result:generator" (field result.files and result.className).
Write each file to: src/connectors/<connectorId>/<filename>
connectorId = "${analysis.connectorId || _toId(analysis.connectorName)}"
Return { "writtenFiles": [...], "className": "..." }`,
      },
    ]
  }

  interpretResults(validatedOutputs, task) {
    const generator  = validatedOutputs.find(r => r.agentId === 'generator')
    const fileWriter = validatedOutputs.find(r => r.agentId === 'file-writer')

    if (generator?.output?.status !== 'success') {
      return { status: 'failed', nextAction: 'retry', reason: 'Code generation failed', output: {}, feedback: {} }
    }
    if (fileWriter?.output?.status !== 'success') {
      return { status: 'failed', nextAction: 'retry', reason: 'File write failed', output: {}, feedback: {} }
    }

    const files     = generator.output.result?.files || {}
    const className = generator.output.result?.className || ''

    return {
      status:     'success',
      nextAction: 'continue',
      output: {
        genResult: {
          files,
          className,
          connectorName: task.analysis.connectorName,
          writtenFiles:  fileWriter.output.result?.writtenFiles || [],
        },
      },
      feedback: {},
    }
  }
}

function _toId(name) {
  return String(name || 'generated').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

module.exports = { CodegenSupervisor }
