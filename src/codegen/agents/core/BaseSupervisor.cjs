'use strict'
const { BaseAgent } = require('./BaseAgent.cjs')
const { createAgentContext } = require('../types/AgentContext.cjs')
const { createStageResult } = require('../types/StageResult.cjs')
const { SchemaValidator } = require('../infrastructure/SchemaValidator.cjs')
const { BudgetTracker } = require('../infrastructure/BudgetTracker.cjs')

const validator = new SchemaValidator()

/**
 * BaseSupervisor — orchestrates child agents within a single pipeline stage.
 *
 * Subclasses must implement:
 *   getStageId()       → string
 *   getChildAgentDefs() → [{ agentId, role, allowedTools, task, parallel? }]
 *   interpretResults(childOutputs) → { status, output, feedback, nextAction }
 *
 * Subclasses may override:
 *   shouldRetry(attempt, results) → boolean
 *   onEscalate(reason, context)
 */
class BaseSupervisor {
  constructor(infrastructure) {
    // infrastructure: { memory, bus, logger, toolRegistry, config }
    this.memory       = infrastructure.memory
    this.bus          = infrastructure.bus
    this.logger       = infrastructure.logger
    this.registry     = infrastructure.toolRegistry
    this.config       = infrastructure.config || {}
    this._validator   = validator
  }

  getStageId()        { throw new Error('Subclass must implement getStageId()') }
  getChildAgentDefs() { throw new Error('Subclass must implement getChildAgentDefs()') }
  interpretResults()  { throw new Error('Subclass must implement interpretResults()') }

  async run(task, runId) {
    const stageId  = this.getStageId()
    const startMs  = Date.now()
    const maxRetry = this.config.multiAgent?.maxRetries || 3
    const budget   = new BudgetTracker(stageId, {
      maxTokens: this.config.multiAgent?.tokenBudgetPerStage || 100_000,
      maxCalls:  this.config.multiAgent?.maxCallsPerStage    || 20,
    })

    this.logger.startAgent(`supervisor:${stageId}`, `Supervisor[${stageId}]`, { stageId })

    // Pull any cross-stage feedback written by downstream stages (Gap #7)
    const incomingFeedback = this.memory.pullFeedback(stageId)
    if (incomingFeedback.length) {
      this.logger.logDecision(
        `supervisor:${stageId}`,
        'apply_feedback',
        `${incomingFeedback.length} cross-stage feedback item(s) received`
      )
    }

    let attempt = 0
    let lastResult = null

    while (attempt <= maxRetry) {
      this.bus.publish(`stage:${stageId}:attempt`, { attempt, runId })

      // 1. Get child agent definitions (subclass decides based on task + feedback)
      const agentDefs = this.getChildAgentDefs(task, incomingFeedback, attempt)

      // 2. Spawn child agents (parallel where flagged, sequential otherwise)
      const childOutputs = await this._spawnAgents(agentDefs, runId, stageId, budget)

      // 3. Validate each output
      const validatedOutputs = childOutputs.map(({ agentId, output }) => {
        const { valid, errors } = this._validator.validateAgentOutput(output)
        if (!valid) {
          this.logger.logError(`supervisor:${stageId}`, new Error(`Agent ${agentId} output invalid: ${errors.join(', ')}`))
          return { agentId, output: this._validator.coerce(output), validationErrors: errors }
        }
        return { agentId, output, validationErrors: [] }
      })

      // 4. Interpret results — subclass decides status + output
      const interpretation = this.interpretResults(validatedOutputs, task, incomingFeedback)
      lastResult = interpretation

      this.logger.logDecision(
        `supervisor:${stageId}`,
        interpretation.nextAction || 'continue',
        interpretation.reason || ''
      )

      // 5. Decide next action
      if (interpretation.nextAction === 'escalate') {
        await this._escalate(interpretation.reason || 'Stage requires human review', runId, stageId)
      }

      if (interpretation.status === 'success' || interpretation.nextAction === 'continue') break
      if (interpretation.nextAction === 'retry' && this.shouldRetry(attempt, validatedOutputs)) {
        attempt++
        continue
      }
      break
    }

    // 6. Write feedback to memory for upstream stages if needed (Gap #7)
    if (lastResult?.feedback && Object.keys(lastResult.feedback).length) {
      for (const [targetStage, fb] of Object.entries(lastResult.feedback)) {
        this.memory.pushFeedback(stageId, targetStage, fb)
      }
    }

    const stageResult = createStageResult({
      stageId,
      status:        lastResult?.status || 'failed',
      duration:      Date.now() - startMs,
      tokensUsed:    budget.usedTokens,
      agentsSpawned: this.getChildAgentDefs(task, [], 0).map(d => d.agentId),
      output:        lastResult?.output || {},
      feedback:      lastResult?.feedback || {},
    })

    this.logger.endAgent(`supervisor:${stageId}`, stageResult)
    this.bus.publish(`stage:${stageId}:done`, { stageId, status: stageResult.status, runId })
    return stageResult
  }

  async _spawnAgents(agentDefs, runId, stageId, budget) {
    const results = []
    let i = 0

    while (i < agentDefs.length) {
      const def = agentDefs[i]
      if (!def.parallel) {
        results.push(await this._runChild(def, runId, stageId, budget))
        i++
        continue
      }

      const parallelBlock = []
      while (i < agentDefs.length && agentDefs[i].parallel) {
        parallelBlock.push(agentDefs[i])
        i++
      }
      const parallelResults = await Promise.all(
        parallelBlock.map(item => this._runChild(item, runId, stageId, budget))
      )
      results.push(...parallelResults)
    }

    return results
  }

  async _runChild(def, runId, stageId, budget) {
    const tools   = this.registry.getForAgent(def.allowedTools || [])
    const context = createAgentContext({
      runId,
      stageId,
      agentId:      def.agentId,
      memory:       this.memory,
      budget,
      logger:       this.logger,
      bus:          this.bus,
      parentTrace:  `supervisor:${stageId}`,
      allowedTools: def.allowedTools || [],
      retryLimit:   def.retryLimit || 2,
      outputSchema: def.outputSchema || null,
      modelOverride: def.modelOverride || null,
    })
    context.toolDescriptions = this.registry.describe(def.allowedTools || [])

    const AgentClass = def.AgentClass || BaseAgent
    const agent = new AgentClass(def.agentId, def.role, context, tools)

    this.bus.publish(`agent:${def.agentId}:start`, { agentId: def.agentId, stageId, runId })
    const output = await agent.run(def.task)
    this.bus.publish(`agent:${def.agentId}:done`, { agentId: def.agentId, status: output.status, runId })

    // Store result in shared memory so other agents can read it
    this.memory.write(`result:${def.agentId}`, output, { agentId: def.agentId, stageId })

    return { agentId: def.agentId, output }
  }

  // Gap #6: Escalate to existing ConversationGate — no separate approval flow
  async _escalate(reason, runId, stageId) {
    const { gate, webGate } = require('../../hitl/ConversationGate.cjs')
    const { bus, EVENTS }   = require('../../pipeline/event-bus.cjs')

    this.logger.logDecision(`supervisor:${stageId}`, 'escalate', reason)
    this.bus.publish(`stage:${stageId}:escalate`, { reason, runId })

    // If running in web/UI mode, use webGate; otherwise use CLI gate
    if (this.config._webMode) {
      return webGate(stageId, bus, EVENTS)
    }
    return gate(stageId, reason, { interactive: true, stepConfig: {} })
  }

  shouldRetry(attempt, results) {
    const hasFailure = results.some(r => r.output?.status === 'failed' || r.output?.status === 'needs_retry')
    return hasFailure
  }
}

module.exports = { BaseSupervisor }
