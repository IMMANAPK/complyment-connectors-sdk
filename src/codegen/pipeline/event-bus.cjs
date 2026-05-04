'use strict'
const { EventEmitter } = require('events')

// Central event bus for the generator pipeline.
// All pipeline steps emit events here; the orchestrator and UI server listen.
class PipelineEventBus extends EventEmitter {}

const bus = new PipelineEventBus()
bus.setMaxListeners(30)

// Event names
const EVENTS = Object.freeze({
  STEP_START:    'step:start',    // { step, stepIndex, total }
  STEP_DONE:     'step:done',     // { step, stepIndex, output }
  STEP_ERROR:    'step:error',    // { step, stepIndex, error }
  STEP_SKIP:     'step:skip',     // { step, stepIndex }
  HITL_PROMPT:   'hitl:prompt',   // { step, message }
  HITL_RESPONSE: 'hitl:response', // { step, instruction }
  LOG:           'log',           // { level, message }
  DONE:          'done',          // { runId, output }
  ABORT:         'abort',         // { reason }
})

module.exports = { bus, EVENTS }
