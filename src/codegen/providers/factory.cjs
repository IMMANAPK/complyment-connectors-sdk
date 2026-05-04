'use strict'
// Auto-detects which LLM provider to use based on available env keys.
// Priority: ANTHROPIC → GEMINI → OPENAI
// All providers expose the same interface: generate(systemPrompt, userPrompt) → Promise<string>
// setProvider() overrides detection at runtime (e.g. --provider openai CLI flag).

let _override = null

function setProvider(name) {
  const valid = ['anthropic', 'gemini', 'openai', 'heuristic']
  if (name && !valid.includes(name)) throw new Error(`Unknown provider: ${name}. Valid: ${valid.join(', ')}`)
  _override = name || null
}

function getProvider() {
  const key = _override || _autoDetect()
  if (key === 'anthropic') return require('./anthropic.cjs')
  if (key === 'gemini')    return require('./gemini.cjs')
  if (key === 'openai')    return require('./openai.cjs')
  return require('./heuristic.cjs')
}

function getProviderName() {
  return _override || _autoDetect()
}

function _autoDetect() {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return 'gemini'
  if (process.env.OPENAI_API_KEY) return 'openai'
  return 'heuristic'
}

module.exports = { getProvider, getProviderName, setProvider }
