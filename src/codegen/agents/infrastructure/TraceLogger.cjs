'use strict'
const fs   = require('fs')
const path = require('path')

/**
 * Per-agent execution trace logger.
 * Writes structured JSON traces to .connector-gen/traces/<runId>/<agentId>.json
 * Set env AGENT_TRACE_LOG=1 to also print to stdout.
 */
class TraceLogger {
  constructor(runId, rootDir = process.cwd()) {
    this.runId   = runId
    this.rootDir = rootDir
    this._traces = new Map()     // agentId → entry[]
    this._starts = new Map()     // agentId → startMs
  }

  startAgent(agentId, role, context = {}) {
    this._starts.set(agentId, Date.now())
    this._traces.set(agentId, [])
    this._push(agentId, { type: 'start', role, stageId: context.stageId, parentTrace: context.parentTrace })
  }

  logDecision(agentId, action, reasoning = '') {
    this._push(agentId, { type: 'decision', action, reasoning })
  }

  logToolCall(agentId, toolName, args, result, durationMs = 0) {
    this._push(agentId, { type: 'tool_call', toolName, args: _safe(args), result: _safe(result), durationMs })
  }

  logError(agentId, error) {
    this._push(agentId, { type: 'error', message: error?.message || String(error) })
  }

  endAgent(agentId, output) {
    const duration = Date.now() - (this._starts.get(agentId) || Date.now())
    this._push(agentId, { type: 'end', status: output?.status, duration })
    this._flush(agentId)
  }

  getTrace(agentId)  { return this._traces.get(agentId) || [] }
  getAllTraces()      { return Object.fromEntries(this._traces) }

  _push(agentId, entry) {
    const entries = this._traces.get(agentId) || []
    entries.push({ ...entry, ts: new Date().toISOString() })
    this._traces.set(agentId, entries)
    if (process.env.AGENT_TRACE_LOG) {
      console.log(`[TRACE ${agentId}]`, JSON.stringify(entry))
    }
  }

  _flush(agentId) {
    try {
      const dir = path.join(this.rootDir, '.connector-gen', 'traces', this.runId)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(
        path.join(dir, `${agentId}.json`),
        JSON.stringify(this._traces.get(agentId) || [], null, 2)
      )
    } catch { /* non-critical — never break pipeline */ }
  }
}

function _safe(v) {
  try { return JSON.parse(JSON.stringify(v)) } catch { return String(v).slice(0, 500) }
}

const _loggers = new Map()
function getLogger(runId, rootDir)  {
  if (!_loggers.has(runId)) _loggers.set(runId, new TraceLogger(runId, rootDir))
  return _loggers.get(runId)
}
function releaseLogger(runId) { _loggers.delete(runId) }

module.exports = { TraceLogger, getLogger, releaseLogger }
