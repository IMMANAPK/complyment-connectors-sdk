'use strict'
const fs = require('fs')
const path = require('path')

function readExistingConnector(rootDir, connectorId) {
  const dir = path.join(rootDir, 'src', 'connectors', connectorId)
  if (!fs.existsSync(dir)) return {}
  const files = {}
  for (const name of fs.readdirSync(dir)) {
    if (/\.(ts|tsx|js|cjs)$/.test(name)) {
      files[name] = fs.readFileSync(path.join(dir, name), 'utf8')
    }
  }
  return files
}

function getChangelog(analysis, existingFiles = {}) {
  const existingText = Object.values(existingFiles).join('\n')
  const operations = analysis.operationsFound || []
  const changes = operations
    .filter(op => !new RegExp(`\\b${escapeRegExp(op)}\\b`).test(existingText))
    .map(name => ({ type: 'operation_added', name, what: 'operation found in uploaded document', severity: 'additive' }))

  return {
    changes,
    summary: changes.length ? `${changes.length} additive change(s)` : 'No operation-level changes detected',
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

module.exports = { readExistingConnector, getChangelog }
