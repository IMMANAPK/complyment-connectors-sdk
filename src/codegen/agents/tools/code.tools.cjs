'use strict'
const { runTypecheck } = require('../../type-checker.cjs')

function registerCodeTools(registry, rootDir = process.cwd()) {
  registry.register('code', 'runTsc', async () => {
    return runTypecheck(rootDir)
  }, {
    description: 'Run TypeScript compiler (tsc --noEmit) and return errors',
    params: [],
  })

  registry.register('code', 'applyPatch', async ({ filePath, content }) => {
    const fs   = require('fs')
    const path = require('path')
    const full = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, content, 'utf8')
    return { patched: filePath }
  }, {
    description: 'Overwrite a file with new content (apply a fix)',
    params: [
      { name: 'filePath', type: 'string' },
      { name: 'content',  type: 'string' },
    ],
  })

  registry.register('code', 'formatCode', async ({ content }) => {
    // Basic normalisation — tabs→spaces, trim trailing whitespace
    return content
      .split('\n')
      .map(line => line.replace(/\t/g, '  ').trimEnd())
      .join('\n')
      .trim()
  }, {
    description: 'Normalize whitespace in TypeScript/JavaScript source',
    params: [{ name: 'content', type: 'string' }],
  })

  registry.register('code', 'readTsErrors', async () => {
    const { runTypecheck: rtc } = require('../../type-checker.cjs')
    const result = rtc(rootDir)
    return result.errors || []
  }, {
    description: 'Return current TypeScript errors without modifying files',
    params: [],
  })
}

module.exports = { registerCodeTools }
