'use strict'
const fs = require('fs')
const path = require('path')
const { patchExports, patchRegistry } = require('./registry-patcher.cjs')

function writeGeneratedFiles(result, rootDir = process.cwd(), options = {}) {
  const dir = path.join(rootDir, 'src', 'connectors', result.connectorId)
  const written = []
  const previews = []

  for (const [filename, content] of Object.entries(result.files || {})) {
    if (filename === 'registry_patch') continue
    const filePath = path.join(dir, filename)
    previews.push({ path: filePath, content: String(content) })
    if (!options.dryRun) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      fs.writeFileSync(filePath, String(content))
    }
    written.push(filePath)
  }

  const patches = [
    patchExports(result, rootDir, options),
    patchRegistry(result, rootDir, options),
  ]
  return { files: written, previews, patches, dryRun: !!options.dryRun }
}

module.exports = { writeGeneratedFiles }
