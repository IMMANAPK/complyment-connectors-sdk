'use strict'

const AGENT_OUTPUT_SCHEMA = {
  status:      { type: 'string', enum: ['success', 'failed', 'needs_retry', 'blocked'] },
  confidence:  { type: 'number', min: 0, max: 100 },
  summary:     { type: 'string' },
  result:      { type: 'object' },
  errors:      { type: 'array' },
  tools_used:  { type: 'array' },
  next_action: { type: 'string', enum: ['continue', 'retry', 'spawn_more', 'escalate'] },
}

function createAgentOutput({ status, confidence = 70, summary = '', result = {}, errors = [], tools_used = [], next_action = 'continue' }) {
  return { status, confidence, summary, result, errors, tools_used, next_action }
}

function successOutput(summary, result = {}, confidence = 90, tools_used = []) {
  return createAgentOutput({ status: 'success', confidence, summary, result, errors: [], tools_used, next_action: 'continue' })
}

function failedOutput(summary, errors = [], next_action = 'retry') {
  return createAgentOutput({ status: 'failed', confidence: 0, summary, result: {}, errors, tools_used: [], next_action })
}

function retryOutput(summary, errors = []) {
  return createAgentOutput({ status: 'needs_retry', confidence: 30, summary, result: {}, errors, tools_used: [], next_action: 'retry' })
}

function blockedOutput(summary, errors = []) {
  return createAgentOutput({ status: 'blocked', confidence: 0, summary, result: {}, errors, tools_used: [], next_action: 'escalate' })
}

module.exports = { AGENT_OUTPUT_SCHEMA, createAgentOutput, successOutput, failedOutput, retryOutput, blockedOutput }
