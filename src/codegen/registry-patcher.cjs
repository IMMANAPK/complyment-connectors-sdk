'use strict'
const fs = require('fs')
const path = require('path')

function patchExports(result, rootDir = process.cwd(), options = {}) {
  const indexPath = path.join(rootDir, 'src', 'index.ts')
  if (!fs.existsSync(indexPath)) return { changed: false, path: indexPath, reason: 'missing' }

  const exportLine = `export { ${result.className} } from './connectors/${result.connectorId}/${result.className}'`
  const typesLine = `export * from './connectors/${result.connectorId}/types'`
  const current = fs.readFileSync(indexPath, 'utf8')
  const additions = [exportLine, typesLine].filter(line => !current.includes(line))
  if (!additions.length) return { changed: false, path: indexPath }

  if (options.dryRun) return { changed: true, path: indexPath, dryRun: true, additions }
  fs.writeFileSync(indexPath, `${current.trimEnd()}\n\n${additions.join('\n')}\n`)
  return { changed: true, path: indexPath, additions }
}

function patchRegistry(result, rootDir = process.cwd(), options = {}) {
  const registryPath = path.join(rootDir, 'playground', 'connectors.registry.cjs')
  if (!fs.existsSync(registryPath)) return { changed: false, path: registryPath, reason: 'missing' }

  const current = fs.readFileSync(registryPath, 'utf8')
  if (new RegExp(`\\n\\s*['"]?${escapeRegExp(result.connectorId)}['"]?\\s*:`).test(current)) {
    return { changed: false, path: registryPath }
  }

  const entry = buildRegistryEntry(result)
  const insertion = `\n\n  '${result.connectorId}': ${entry},`
  const lastBrace = current.lastIndexOf('\n}')
  if (lastBrace === -1) return { changed: false, path: registryPath, reason: 'insert-failed' }
  const patched = current.slice(0, lastBrace) + insertion + current.slice(lastBrace)

  if (options.dryRun) return { changed: true, path: registryPath, dryRun: true, entry }
  fs.writeFileSync(registryPath, patched)
  return { changed: true, path: registryPath, entry }
}

function buildRegistryEntry(result) {
  const patch = result.files.registry_patch && typeof result.files.registry_patch === 'object'
    ? result.files.registry_patch
    : {}
  const opsConfig = {}
  for (const op of result.operations || []) {
    opsConfig[op] = { desc: labelize(op), params: {} }
  }
  return formatObject({
    sdkClass: result.className,
    label: result.analysis?.connectorName || patch.label || result.connectorId,
    desc: patch.desc || 'Generated connector',
    color: patch.color || '#00cfb0',
    fields: patch.fields || defaultFields(result.analysis?.authType),
    opsConfig: patch.opsConfig || opsConfig,
  }, 2)
}

function defaultFields(authType = '') {
  const auth = String(authType).toLowerCase()
  if (auth.includes('basic')) {
    return [
      { key: 'baseUrl', label: 'Base URL', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ]
  }
  if (auth.includes('bearer')) {
    return [
      { key: 'baseUrl', label: 'Base URL', type: 'text', required: true },
      { key: 'token', label: 'Bearer Token', type: 'password', required: true },
    ]
  }
  return [
    { key: 'baseUrl', label: 'Base URL', type: 'text', required: true },
    { key: 'apiKey', label: 'API Key', type: 'password', required: true },
  ]
}

function labelize(name) {
  return String(name).replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()
}

function formatObject(value, indent = 0) {
  return JSON.stringify(value, null, 2)
    .replace(/"([^"]+)":/g, '$1:')
    .split('\n')
    .map((line, i) => (i === 0 ? line : `${' '.repeat(indent)}${line}`))
    .join('\n')
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

module.exports = { patchExports, patchRegistry }
