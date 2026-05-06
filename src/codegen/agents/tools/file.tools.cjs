'use strict'
const fs   = require('fs')
const path = require('path')

function registerFileTools(registry, rootDir = process.cwd()) {
  registry.register('file', 'readFile', async ({ filePath }) => {
    const full = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath)
    if (!fs.existsSync(full)) throw new Error(`File not found: ${filePath}`)
    return fs.readFileSync(full, 'utf8')
  }, {
    description: 'Read a file and return its content as a string',
    params: [{ name: 'filePath', type: 'string', description: 'Absolute or rootDir-relative path' }],
  })

  registry.register('file', 'writeFile', async ({ filePath, content }) => {
    const full = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, content, 'utf8')
    return { written: filePath, bytes: Buffer.byteLength(content) }
  }, {
    description: 'Write content to a file (creates directories as needed)',
    params: [
      { name: 'filePath', type: 'string' },
      { name: 'content',  type: 'string' },
    ],
  })

  registry.register('file', 'listFiles', async ({ dir, pattern = '' }) => {
    const full = path.isAbsolute(dir) ? dir : path.join(rootDir, dir)
    if (!fs.existsSync(full)) return []
    const entries = fs.readdirSync(full, { withFileTypes: true })
    return entries
      .filter(e => e.isFile() && (!pattern || e.name.includes(pattern)))
      .map(e => path.join(dir, e.name))
  }, {
    description: 'List files in a directory, optionally filtered by a name pattern',
    params: [
      { name: 'dir',     type: 'string' },
      { name: 'pattern', type: 'string', description: 'Optional filename substring filter' },
    ],
  })

  registry.register('file', 'fileExists', async ({ filePath }) => {
    const full = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath)
    return fs.existsSync(full)
  }, {
    description: 'Check if a file exists',
    params: [{ name: 'filePath', type: 'string' }],
  })
}

module.exports = { registerFileTools }
