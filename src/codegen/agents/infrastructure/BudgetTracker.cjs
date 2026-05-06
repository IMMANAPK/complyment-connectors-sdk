'use strict'

/**
 * Token + LLM call budget per stage.
 * Gap #5: Uses real token count when provider exposes it,
 *         falls back to chars/4 estimation for Gemini/others.
 */
class BudgetTracker {
  constructor(stageId, opts = {}) {
    this.stageId   = stageId
    this.maxTokens = opts.maxTokens || 100_000
    this.maxCalls  = opts.maxCalls  || 20
    this.usedTokens = 0
    this.usedCalls  = 0
    this._agentUsage = new Map() // agentId → { tokens, calls }
  }

  /**
   * Charge for one LLM call.
   * If provider returns real token counts pass them; otherwise pass text for estimation.
   */
  charge({ promptText = '', responseText = '', realTokens = null, agentId = 'unknown' } = {}) {
    const tokens = realTokens !== null
      ? realTokens
      : estimateTokens(promptText) + estimateTokens(responseText)

    this.usedTokens += tokens
    this.usedCalls  += 1

    const prev = this._agentUsage.get(agentId) || { tokens: 0, calls: 0 }
    this._agentUsage.set(agentId, { tokens: prev.tokens + tokens, calls: prev.calls + 1 })
    return tokens
  }

  isExhausted() {
    return this.usedTokens >= this.maxTokens || this.usedCalls >= this.maxCalls
  }

  getRemaining() {
    return {
      tokens: Math.max(0, this.maxTokens - this.usedTokens),
      calls:  Math.max(0, this.maxCalls  - this.usedCalls),
    }
  }

  getReport() {
    return {
      stageId:        this.stageId,
      usedTokens:     this.usedTokens,
      maxTokens:      this.maxTokens,
      usedCalls:      this.usedCalls,
      maxCalls:       this.maxCalls,
      exhausted:      this.isExhausted(),
      agentBreakdown: Object.fromEntries(this._agentUsage),
    }
  }
}

function estimateTokens(text) {
  return Math.ceil(String(text || '').length / 4)
}

module.exports = { BudgetTracker, estimateTokens }
