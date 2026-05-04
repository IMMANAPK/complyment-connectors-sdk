'use strict'
const fs = require('fs')
const path = require('path')

function stateDir(rootDir = process.cwd()) {
  return path.join(rootDir, '.connector-gen')
}

function statePath(rootDir, connectorId) {
  return path.join(stateDir(rootDir), `${connectorId}.json`)
}

function saveState(rootDir, state) {
  fs.mkdirSync(stateDir(rootDir), { recursive: true })
  const file = statePath(rootDir, state.connectorId || state.runId)
  fs.writeFileSync(file, JSON.stringify({ ...state, savedAt: new Date().toISOString() }, null, 2))
  return file
}

function loadState(rootDir, connectorId) {
  const file = statePath(rootDir, connectorId)
  if (!fs.existsSync(file)) throw new Error(`No saved generator state for ${connectorId}`)
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

module.exports = { saveState, loadState, stateDir, statePath }
