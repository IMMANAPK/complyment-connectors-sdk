'use strict'

/**
 * Shared memory per pipeline run.
 * Access policies: 'public' | 'stage:<id>' | 'agent:<id>'
 * Downstream stages push feedback; upstream stages pull it.
 */
class AgentMemory {
  constructor(runId) {
    this.runId = runId
    this._store = new Map()     // key → { value, writtenBy, stageId, at }
    this._policies = new Map()  // key → policy string
  }

  setPolicy(key, policy) {
    this._policies.set(key, policy)
  }

  _canAccess(key, agentId, stageId) {
    const policy = this._policies.get(key) || 'public'
    if (policy === 'public') return true
    if (policy.startsWith('stage:')) return policy === `stage:${stageId}`
    if (policy.startsWith('agent:')) return policy === `agent:${agentId}`
    return false
  }

  read(key, { agentId = 'unknown', stageId = 'unknown' } = {}) {
    if (!this._canAccess(key, agentId, stageId)) return undefined
    return this._store.get(key)?.value
  }

  write(key, value, { agentId = 'unknown', stageId = 'unknown', policy = 'public' } = {}) {
    this._policies.set(key, policy)
    this._store.set(key, { value, writtenBy: agentId, stageId, at: Date.now() })
  }

  getAll({ agentId = 'unknown', stageId = 'unknown' } = {}) {
    const result = {}
    for (const [key] of this._store) {
      if (this._canAccess(key, agentId, stageId)) {
        result[key] = this._store.get(key).value
      }
    }
    return result
  }

  // Cross-stage feedback — Gap #7
  pushFeedback(fromStage, toStage, feedback) {
    const key = `feedback:${toStage}`
    const existing = this._store.get(key)?.value || []
    this._store.set(key, {
      value: [...existing, { fromStage, feedback, at: Date.now() }],
      writtenBy: fromStage, stageId: fromStage, at: Date.now(),
    })
    this._policies.set(key, 'public')
  }

  pullFeedback(stageId) {
    const key = `feedback:${stageId}`
    const data = this._store.get(key)?.value || []
    this._store.delete(key) // consume once read
    return data
  }

  snapshot() {
    const out = {}
    for (const [key, entry] of this._store) out[key] = entry
    return out
  }

  destroy() { this._store.clear(); this._policies.clear() }
}

const _memories = new Map()

function getMemory(runId) {
  if (!_memories.has(runId)) _memories.set(runId, new AgentMemory(runId))
  return _memories.get(runId)
}

function releaseMemory(runId) {
  const m = _memories.get(runId)
  if (m) { m.destroy(); _memories.delete(runId) }
}

module.exports = { AgentMemory, getMemory, releaseMemory }
