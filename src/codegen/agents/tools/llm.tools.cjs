'use strict'
const { getProvider } = require('../../providers/factory.cjs')
const { analyzeDocument } = require('../../analyzer.cjs')
const { reviewCode } = require('../../code-reviewer.cjs')

function registerLlmTools(registry) {
  registry.register('llm', 'generate', async ({ system, prompt }) => {
    const llm = getProvider()
    return llm.generate(system, prompt)
  }, {
    description: 'Call the configured LLM with a system + user prompt and return a string response',
    params: [
      { name: 'system', type: 'string', description: 'System prompt' },
      { name: 'prompt', type: 'string', description: 'User prompt' },
    ],
  })

  registry.register('llm', 'analyze', async ({ docText, humanInstruction = '' }) => {
    return analyzeDocument(docText, humanInstruction)
  }, {
    description: 'Analyze an API document and extract connector metadata (name, auth, operations, etc.)',
    params: [
      { name: 'docText',          type: 'string' },
      { name: 'humanInstruction', type: 'string' },
    ],
  })

  registry.register('llm', 'review', async ({ generatorResult, humanInstruction = '' }) => {
    return reviewCode(generatorResult, humanInstruction)
  }, {
    description: 'Review generated connector code and return a score, verdict, and issues list',
    params: [
      { name: 'generatorResult',  type: 'object', description: 'Output from the code generator' },
      { name: 'humanInstruction', type: 'string' },
    ],
  })

  registry.register('llm', 'parseJson', async ({ text }) => {
    const cleaned = text.replace(/```json|```/g, '').trim()
    try { return JSON.parse(cleaned) } catch {
      const m = cleaned.match(/\{[\s\S]*\}/)
      if (m) return JSON.parse(m[0])
      throw new Error('Could not parse JSON from LLM response')
    }
  }, {
    description: 'Parse a JSON object from raw LLM text (strips markdown fences)',
    params: [{ name: 'text', type: 'string' }],
  })
}

module.exports = { registerLlmTools }
