'use strict'
const fs = require('fs')
const path = require('path')
const { DEFAULT_CONFIG } = require('./defaults.cjs')

function loadConfig(rootDir = process.cwd(), flags = {}) {
  const configPath = path.join(rootDir, '.connector-gen.config.json')
  const fileConfig = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
    : {}

  const merged = deepMerge(DEFAULT_CONFIG, fileConfig)

  if (flags.mode) merged.mode = normalizeMode(flags.mode)
  if (flags.auto || flags.mode === 'auto') merged.mode = 'auto'
  if (flags.interactive) merged.mode = 'interactive'
  if (flags['dry-run'] !== undefined || flags.dryRun !== undefined) merged.dryRun = true
  if (flags.apply || flags['apply-git']) {
    merged.dryRun = false
    merged.applyGit = true
  }
  if (flags['create-pr']) merged.createPr = true
  if (flags.notify) merged.sendNotifications = true
  if (flags['run-tests']) merged.runTests = true
  if (flags['skip-typecheck']) merged.runTypecheck = false

  return validateConfig(merged)
}

function normalizeMode(mode) {
  if (mode === 'auto' || mode === 'interactive' || mode === 'custom') return mode
  if (mode === 'create' || mode === 'update') return 'interactive'
  return mode
}

function validateConfig(config) {
  if (!['interactive', 'auto', 'custom'].includes(config.mode)) {
    throw new Error(`Invalid generator mode: ${config.mode}`)
  }
  if (!['auto-approve', 'auto-reject', 'wait'].includes(config.onTimeout)) {
    throw new Error(`Invalid onTimeout: ${config.onTimeout}`)
  }
  return config
}

function stepConfigFrom(config) {
  const out = {}
  for (const [step, value] of Object.entries(config.hitl || {})) {
    out[step] = { interactive: config.mode !== 'auto' && value.enabled !== false, ...value }
  }
  return out
}

function deepMerge(base, extra) {
  if (!extra || typeof extra !== 'object') return clone(base)
  const out = clone(base)
  for (const [key, value] of Object.entries(extra)) {
    out[key] = isPlainObject(value) && isPlainObject(out[key])
      ? deepMerge(out[key], value)
      : value
  }
  return out
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

module.exports = { loadConfig, stepConfigFrom }
