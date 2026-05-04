#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const ROOT = process.env.CONNECTOR_GENERATOR_ROOT || process.cwd()

const TOOLS = [
  {
    name: 'analyze_document',
    description: 'Validate an API document from inline text or a file path.',
    inputSchema: {
      type: 'object',
    properties: { text: { type: 'string' }, file: { type: 'string' }, url: { type: 'string' } },
    },
  },
  {
    name: 'generate_connector',
    description: 'Run the CREATE connector generation pipeline.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string' }, file: { type: 'string' }, url: { type: 'string' }, auto: { type: 'boolean' } },
    },
  },
  {
    name: 'update_connector',
    description: 'Run the UPDATE connector generation pipeline.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string' }, file: { type: 'string' }, url: { type: 'string' }, connectorId: { type: 'string' }, auto: { type: 'boolean' } },
    },
  },
  {
    name: 'list_connectors',
    description: 'List registered playground connectors.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_connector_files',
    description: 'Read existing connector source files.',
    inputSchema: { type: 'object', properties: { connectorId: { type: 'string' } }, required: ['connectorId'] },
  },
  {
    name: 'run_typecheck',
    description: 'Run TypeScript typecheck for the SDK.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_changelog',
    description: 'Analyze document changes against an existing connector.',
    inputSchema: { type: 'object', properties: { text: { type: 'string' }, file: { type: 'string' }, url: { type: 'string' }, connectorId: { type: 'string' } }, required: ['connectorId'] },
  },
]

async function callTool(name, args = {}) {
  if (name === 'analyze_document') {
    const { analyzeDocument } = require('../../codegen/analyzer.cjs')
    return analyzeDocument(await inputText(args))
  }
  if (name === 'generate_connector' || name === 'update_connector') {
    const { run } = require('../../codegen/pipeline/orchestrator.cjs')
    return run({
      rootDir: ROOT,
      docText: args.text ? String(args.text) : undefined,
      docPath: args.file ? path.resolve(ROOT, args.file) : undefined,
      docUrl: args.url ? String(args.url) : undefined,
      mode: name === 'update_connector' ? 'update' : 'create',
      autoApprove: args.auto !== false,
    })
  }
  if (name === 'list_connectors') {
    const registryPath = path.join(ROOT, 'playground', 'connectors.registry.cjs')
    delete require.cache[require.resolve(registryPath)]
    return require(registryPath)
  }
  if (name === 'get_connector_files') {
    const dir = path.join(ROOT, 'src', 'connectors', args.connectorId)
    const files = {}
    for (const file of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
      if (file.endsWith('.ts')) files[file] = fs.readFileSync(path.join(dir, file), 'utf8')
    }
    return files
  }
  if (name === 'run_typecheck') {
    const { runTypecheck } = require('../../codegen/type-checker.cjs')
    return runTypecheck(ROOT)
  }
  if (name === 'get_changelog') {
    const { analyzeDocument } = require('../../codegen/analyzer.cjs')
    const { readExistingConnector, getChangelog } = require('../../codegen/differ.cjs')
    const analysis = await analyzeDocument(await inputText(args))
    return getChangelog(analysis, readExistingConnector(ROOT, args.connectorId))
  }
  throw new Error(`Unknown tool: ${name}`)
}

async function inputText(args) {
  if (args.text) return String(args.text)
  if (args.url) {
    const { extractUrl } = require('../../codegen/extractors/index.cjs')
    return extractUrl(String(args.url))
  }
  if (args.file) return fs.readFileSync(path.resolve(ROOT, args.file), 'utf8')
  throw new Error('Provide text or file')
}

function respond(id, result, error) {
  const payload = error
    ? { jsonrpc: '2.0', id, error: { code: -32000, message: error.message } }
    : { jsonrpc: '2.0', id, result }
  process.stdout.write(`${JSON.stringify(payload)}\n`)
}

function asToolContent(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
}

const rl = readline.createInterface({ input: process.stdin })
rl.on('line', async line => {
  if (!line.trim()) return
  let msg
  try { msg = JSON.parse(line) } catch (err) { return respond(null, null, err) }
  try {
    if (msg.method === 'initialize') {
      return respond(msg.id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'connector-generator', version: '0.3.5' },
      })
    }
    if (msg.method === 'tools/list') return respond(msg.id, { tools: TOOLS })
    if (msg.method === 'tools/call') {
      const result = await callTool(msg.params?.name, msg.params?.arguments || {})
      return respond(msg.id, asToolContent(result))
    }
    if (msg.id) return respond(msg.id, {})
  } catch (err) {
    respond(msg.id, null, err)
  }
})
