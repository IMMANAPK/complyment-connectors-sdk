'use strict'
const { AGENT_OUTPUT_SCHEMA } = require('../types/AgentOutput.cjs')

/**
 * Validates agent outputs and stage results against their expected schemas.
 * Lightweight — no external dependencies.
 */
class SchemaValidator {
  validate(output, schema) {
    const errors = []
    if (!output || typeof output !== 'object' || Array.isArray(output)) {
      return { valid: false, errors: ['Output must be a plain object'] }
    }
    for (const [key, rules] of Object.entries(schema)) {
      const value = output[key]
      const missing = value === undefined || value === null
      if (missing && rules.required !== false) {
        errors.push(`Missing required field: "${key}"`)
        continue
      }
      if (missing) continue
      if (rules.type === 'string'  && typeof value !== 'string')   errors.push(`"${key}" must be a string`)
      if (rules.type === 'number'  && typeof value !== 'number')   errors.push(`"${key}" must be a number`)
      if (rules.type === 'boolean' && typeof value !== 'boolean')  errors.push(`"${key}" must be a boolean`)
      if (rules.type === 'array'   && !Array.isArray(value))       errors.push(`"${key}" must be an array`)
      if (rules.type === 'object'  && (typeof value !== 'object' || Array.isArray(value))) {
        errors.push(`"${key}" must be an object`)
      }
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`"${key}" must be one of: ${rules.enum.join(', ')}`)
      }
      if (rules.min !== undefined && value < rules.min) errors.push(`"${key}" must be >= ${rules.min}`)
      if (rules.max !== undefined && value > rules.max) errors.push(`"${key}" must be <= ${rules.max}`)
    }
    return { valid: errors.length === 0, errors }
  }

  validateAgentOutput(output) {
    return this.validate(output, AGENT_OUTPUT_SCHEMA)
  }

  validateStageResult(result) {
    return this.validate(result, {
      stageId:       { type: 'string' },
      status:        { type: 'string', enum: ['success', 'failed', 'needs_retry', 'blocked', 'skipped'] },
      duration:      { type: 'number' },
      tokensUsed:    { type: 'number' },
      agentsSpawned: { type: 'array' },
      output:        { type: 'object' },
      feedback:      { type: 'object' },
    })
  }

  // Repair common issues in LLM-generated agent output
  coerce(raw) {
    if (!raw || typeof raw !== 'object') raw = {}
    return {
      status:      ['success','failed','needs_retry','blocked'].includes(raw.status) ? raw.status : 'failed',
      confidence:  typeof raw.confidence === 'number' ? Math.min(100, Math.max(0, raw.confidence)) : 50,
      summary:     String(raw.summary || ''),
      result:      (raw.result && typeof raw.result === 'object') ? raw.result : {},
      errors:      Array.isArray(raw.errors) ? raw.errors : [],
      tools_used:  Array.isArray(raw.tools_used) ? raw.tools_used : [],
      next_action: ['continue','retry','spawn_more','escalate'].includes(raw.next_action)
                     ? raw.next_action : 'continue',
    }
  }
}

module.exports = { SchemaValidator }
