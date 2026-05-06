'use strict'
const { successOutput, failedOutput, blockedOutput } = require('../types/AgentOutput.cjs')
const { estimateTokens } = require('../infrastructure/BudgetTracker.cjs')

const REACT_SYSTEM = (role, toolDescriptions) => `You are ${role}.
You solve tasks step by step using the tools available to you.

AVAILABLE TOOLS:
${toolDescriptions}

RULES:
- Respond ONLY with valid JSON — no prose, no markdown.
- Each response must be ONE of these two shapes:

  To call a tool:
  { "action": "tool_call", "tool": "<tool_name>", "args": { ... }, "reasoning": "<why>" }

  To complete the task:
  { "action": "complete", "result": { ... }, "summary": "<what you did>", "confidence": <0-100> }

- Only call tools that are listed above.
- Be precise with args — use exact field names.`

/**
 * BaseAgent — implements the ReAct (Reason + Act) loop.
 * Subclasses override getRole() and optionally postProcess().
 */
class BaseAgent {
  constructor(agentId, role, context, tools) {
    this.agentId = agentId
    this.role    = role
    this.context = context  // AgentContext
    this.tools   = tools    // { 'file.readFile': fn, ... }
  }

  getRole() { return this.role }

  async run(task) {
    const { logger, budget } = this.context
    logger.startAgent(this.agentId, this.getRole(), this.context)

    const toolDescriptions = this.context.toolDescriptions
      || Object.keys(this.tools).map(k => `- ${k}`).join('\n')
      || '(no tools — use reasoning only)'

    const system  = REACT_SYSTEM(this.getRole(), toolDescriptions)
    const history = []
    const toolsUsed = []
    const maxIter = (this.context.retryLimit || 3) * 5

    for (let i = 0; i < maxIter; i++) {
      if (budget.isExhausted()) {
        logger.logError(this.agentId, new Error('Budget exhausted'))
        logger.endAgent(this.agentId, { status: 'blocked' })
        return blockedOutput('Token/call budget exhausted — stage needs re-run with higher budget')
      }

      const prompt = this._buildPrompt(task, history)

      let raw
      try {
        const llm = require('../../providers/factory.cjs').getProvider()
        raw = await llm.generate(system, prompt)
        budget.charge({ promptText: system + prompt, responseText: raw, agentId: this.agentId })
      } catch (err) {
        logger.logError(this.agentId, err)
        const output = failedOutput(`LLM call failed: ${err.message}`, [err.message])
        logger.endAgent(this.agentId, output)
        return output
      }

      let decision
      try {
        decision = this._parseDecision(raw)
      } catch (err) {
        history.push({ role: 'error', content: `Could not parse LLM response: ${raw.slice(0, 200)}` })
        continue
      }

      logger.logDecision(this.agentId, decision.action, decision.reasoning || decision.summary || '')

      // ── COMPLETE ───────────────────────────────────────────────────────────
      if (decision.action === 'complete') {
        const output = successOutput(
          decision.summary || 'Task completed',
          decision.result  || {},
          decision.confidence || 80,
          toolsUsed,
        )
        logger.endAgent(this.agentId, output)
        return output
      }

      // ── TOOL CALL ──────────────────────────────────────────────────────────
      if (decision.action === 'tool_call') {
        const toolName = decision.tool
        const toolFn   = this.tools[toolName]
        if (!toolFn) {
          history.push({ role: 'tool_error', content: `Tool "${toolName}" is not available. Use only listed tools.` })
          continue
        }
        const t0 = Date.now()
        let toolResult
        try {
          toolResult = await toolFn(decision.args || {})
          toolsUsed.push(toolName)
        } catch (err) {
          toolResult = { error: err.message }
        }
        const duration = Date.now() - t0
        logger.logToolCall(this.agentId, toolName, decision.args, toolResult, duration)
        history.push({
          role: 'tool_result',
          content: `Tool: ${toolName}\nArgs: ${JSON.stringify(decision.args)}\nResult: ${JSON.stringify(toolResult).slice(0, 2000)}`,
        })
        continue
      }

      history.push({ role: 'error', content: `Unknown action "${decision.action}". Use "tool_call" or "complete".` })
    }

    const output = failedOutput('Max iterations reached without completing task', [], 'retry')
    logger.endAgent(this.agentId, output)
    return output
  }

  _buildPrompt(task, history) {
    const lines = [`TASK:\n${task}`]
    const memorySnapshot = this._memorySnapshot()
    if (memorySnapshot) {
      lines.push(`\nAVAILABLE MEMORY:\n${memorySnapshot}`)
    }
    if (history.length) {
      lines.push('\nHISTORY:')
      for (const h of history.slice(-12)) { // last 12 turns to limit context
        lines.push(`[${h.role}] ${h.content}`)
      }
    }
    lines.push('\nWhat do you do next?')
    return lines.join('\n')
  }

  _memorySnapshot() {
    const memory = this.context.memory
    if (!memory || typeof memory.getAll !== 'function') return ''

    const visible = memory.getAll({
      agentId: this.agentId,
      stageId: this.context.stageId,
    })
    const keys = Object.keys(visible)
    if (!keys.length) return ''

    const compact = {}
    for (const key of keys) {
      compact[key] = _compactForPrompt(visible[key])
    }
    return JSON.stringify(compact, null, 2).slice(0, 12000)
  }

  _parseDecision(raw) {
    const cleaned = raw.replace(/```json|```/g, '').trim()
    let obj
    try { obj = JSON.parse(cleaned) } catch {
      const m = cleaned.match(/\{[\s\S]*\}/)
      if (m) obj = JSON.parse(m[0])
      else throw new Error('No JSON found in LLM response')
    }
    if (!obj.action) throw new Error('Missing "action" field in LLM response')
    return obj
  }
}

function _compactForPrompt(value) {
  if (typeof value === 'string') {
    return value.length > 4000 ? `${value.slice(0, 4000)}... [truncated]` : value
  }
  if (Array.isArray(value)) return value.slice(0, 20).map(_compactForPrompt)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, child] of Object.entries(value)) {
      out[key] = _compactForPrompt(child)
    }
    return out
  }
  return value
}

module.exports = { BaseAgent }
