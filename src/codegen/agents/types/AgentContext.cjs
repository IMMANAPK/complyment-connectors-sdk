'use strict'

/**
 * Creates a scoped AgentContext passed to every child agent.
 * memory, budget are live objects — agents interact via them, not copies.
 */
function createAgentContext({
  runId,
  stageId,
  agentId,
  memory,       // AgentMemory instance (scoped access)
  budget,       // BudgetTracker instance
  logger,       // TraceLogger instance
  bus,          // MessageBus instance
  parentTrace = '',
  allowedTools = [],
  retryLimit = 3,
  outputSchema = null,
  modelOverride = null,
  toolDescriptions = '',
}) {
  return {
    runId,
    stageId,
    agentId,
    memory,
    budget,
    logger,
    bus,
    parentTrace,
    allowedTools,
    retryLimit,
    outputSchema,
    modelOverride,
    toolDescriptions,
  }
}

module.exports = { createAgentContext }
