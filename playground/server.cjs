'use strict'
const express = require('express')
const path = require('path')

const app = express()
app.use(express.json({ limit: '10mb' }))
app.use(express.static(path.join(__dirname, 'public')))

let sdk
try {
  sdk = require('../dist/index.js')
} catch {
  console.error('\n  [error] SDK not found. Run: npm run build first.\n')
  process.exit(1)
}

// ── Op auto-discovery ─────────────────────────────────────
// Methods to never expose, regardless of connector
const ALWAYS_EXCLUDE = new Set(['authenticate', 'logout', 'constructor'])

// "getCriticalVulnerabilities" → "Get Critical Vulnerabilities"
function methodToLabel(name) {
  return name.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()
}

// Returns true when the compiled function signature has zero parameters, e.g. async testConnection()
function hasNoParams(fn) {
  const m = fn.toString().match(/(?:async\s+)?\w+\s*\(([^)]*)\)/)
  return m ? m[1].trim() === '' : false
}

// Collects all methods defined between ConnectorClass and BaseConnector (exclusive)
function discoverMethods(ConnectorClass) {
  const baseProto = sdk.BaseConnector.prototype
  const names = new Set()
  let proto = ConnectorClass.prototype
  while (proto && proto !== baseProto && proto !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (!ALWAYS_EXCLUDE.has(name) && typeof proto[name] === 'function') names.add(name)
    }
    proto = Object.getPrototypeOf(proto)
  }
  return [...names]
}

// Merges auto-discovered methods with any per-op overrides from opsConfig
function buildOps(ConnectorClass, rawDef) {
  const opsConfig  = rawDef.opsConfig  || {}
  const excluded   = new Set(rawDef.excludeOps || [])

  return discoverMethods(ConnectorClass)
    .filter(name => !excluded.has(name))
    .map(name => {
      const cfg           = opsConfig[name] || {}
      const defaultParams = hasNoParams(ConnectorClass.prototype[name]) ? null : {}
      return {
        id:     name,
        label:  cfg.label  || methodToLabel(name),
        desc:   cfg.desc   || methodToLabel(name),
        params: 'params' in cfg ? cfg.params : defaultParams,
        ...(cfg.args && { args: cfg.args }),
      }
    })
}

// Build the live registry: raw metadata + auto-discovered ops
function buildRegistry(raw) {
  const out = {}
  for (const [id, rawDef] of Object.entries(raw)) {
    const ConnectorClass = sdk[rawDef.sdkClass]
    if (typeof ConnectorClass !== 'function') {
      console.warn(`  [warn] SDK class '${rawDef.sdkClass}' not found — skipping ${id}`)
      continue
    }
    const { opsConfig, excludeOps, ...meta } = rawDef
    out[id] = { ...meta, ops: buildOps(ConnectorClass, rawDef) }
  }
  return out
}

const registry = buildRegistry(require('./connectors.registry.cjs'))

const PORT = Number(process.env.PLAYGROUND_PORT || 4000)
const HOST = process.env.PLAYGROUND_HOST || '127.0.0.1'

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`\n  [error] Invalid PLAYGROUND_PORT: ${process.env.PLAYGROUND_PORT}\n`)
  process.exit(1)
}

// ── Dynamic connector creation ────────────────────────────
// Looks up sdkClass from registry → no switch needed ever again
function createConnector(name, creds) {
  const def = registry[name]
  if (!def) throw new Error(`Unknown connector: ${name}`)

  const ConnectorClass = sdk[def.sdkClass]
  if (typeof ConnectorClass !== 'function') {
    throw new Error(`SDK class '${def.sdkClass}' not found in dist. Rebuild the SDK.`)
  }

  const credentials = Object.fromEntries(
    Object.entries(creds).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  )
  return new ConnectorClass(credentials)
}

// ── Dynamic operation invocation ──────────────────────────
// Calls connector[op]() by name — no switch needed ever again.
// The allowed-ops whitelist (from registry) prevents calling private methods.
//
// ops.args (optional): list of param keys to extract as positional arguments.
//   e.g. args: ['userId']       → connector.deleteUser(params.userId)
//        args: ['userId']       → connector.updateUser(params.userId, {rest})
//        args: ['name','ipAddr']→ connector.addHost(params.name, params.ipAddr)
async function invokeOperation(name, connector, op, params) {
  const def    = registry[name]
  const opDef  = def.ops.find(o => o.id === op)
  const allowed = def.ops.map(o => o.id)

  if (!allowed.includes(op)) {
    throw new Error(`Operation '${op}' is not registered for connector '${name}'`)
  }
  if (typeof connector[op] !== 'function') {
    throw new Error(`Method '${op}' does not exist on ${def.sdkClass}`)
  }

  // Positional-arg extraction — used when the method signature isn't (params: object)
  if (opDef.args?.length > 0) {
    const positional = opDef.args.map(k => params[k])
    const body       = Object.fromEntries(Object.entries(params || {}).filter(([k]) => !opDef.args.includes(k)))
    const callArgs   = Object.keys(body).length > 0 ? [...positional, body] : positional
    return connector[op](...callArgs)
  }

  const hasParams = params && Object.keys(params).length > 0
  return hasParams ? connector[op](params) : connector[op]()
}

// ── Serialization ─────────────────────────────────────────
function safeSerialize(obj) {
  return JSON.parse(JSON.stringify(obj, (_, val) => {
    if (val instanceof Map)    return Object.fromEntries(val)
    if (val instanceof Set)    return Array.from(val)
    if (Buffer.isBuffer(val))  return `<Buffer ${val.length} bytes>`
    return val
  }))
}

// ── Routes ────────────────────────────────────────────────

// Serve registry to the UI (strip sdkClass — internal detail)
app.get('/api/registry', (_, res) => {
  const ui = {}
  for (const [id, def] of Object.entries(registry)) {
    const { sdkClass: _, ...rest } = def  // eslint-disable-line no-unused-vars
    ui[id] = rest
  }
  res.json(ui)
})

app.post('/api/run', async (req, res) => {
  const { connector: name, credentials, operation, params = {} } = req.body

  if (!name || !credentials || !operation) {
    return res.status(400).json({ success: false, error: 'Missing required fields: connector, credentials, operation' })
  }

  const t0 = Date.now()
  try {
    const connector = createConnector(name, credentials)
    const raw = await invokeOperation(name, connector, operation, params)
    res.json({
      success: true,
      data: safeSerialize(raw),
      duration: Date.now() - t0,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    res.json({
      success: false,
      error: err.message,
      duration: Date.now() - t0,
      timestamp: new Date().toISOString(),
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// AI PLAYGROUND
// ═══════════════════════════════════════════════════════════════════════════
//
// How the flow works:
//   1. buildToolsForLLM()  → converts registry ops into LLM tool definitions
//   2. callLLM()           → sends user query + tools to OpenAI or Anthropic
//   3. AI picks an operation and params via tool/function calling
//   4. invokeOperation()   → runs that op through the real SDK connector
//   5. getAISummary()      → asks the LLM to explain the results in plain English
//
// Adding a new connector to the registry automatically gives it AI support.
// No extra npm packages — uses Node.js built-in fetch() (Node 18+).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Converts a connector's registry ops into the tool-call format that LLMs expect.
 * testConnection is excluded — it doesn't return data worth analysing.
 */
function buildToolsForLLM(connectorId, def) {
  return def.ops
    .filter(op => op.id !== 'testConnection')
    .map(op => ({
      name:        op.id,
      description: op.desc,
      parameters:  buildParamSchema(op.params),
    }))
}

/**
 * Infers a minimal JSON Schema from the default params stored in the registry.
 * Tells the LLM which parameters each operation accepts and their types.
 */
function buildParamSchema(params) {
  if (!params || Object.keys(params).length === 0) {
    return { type: 'object', properties: {} }
  }
  const properties = {}
  for (const [key, val] of Object.entries(params)) {
    if (Array.isArray(val)) {
      properties[key] = { type: 'array', items: { type: typeof val[0] }, description: `Filter by ${key}` }
    } else if (typeof val === 'number') {
      properties[key] = { type: 'number', description: `Filter by ${key}`, default: val }
    } else {
      properties[key] = { type: 'string', description: `Filter by ${key}`, default: String(val) }
    }
  }
  return { type: 'object', properties }
}

/**
 * Calls the OpenAI Chat Completions API with function/tool calling.
 * Model: gpt-4o-mini — fast, cheap, excellent at tool selection.
 * Returns: { toolCall: { name, params } | null, message: string | null }
 */
async function callOpenAI({ apiKey, query, tools, connectorLabel }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role:    'system',
          content: `You are a security analyst assistant. The user wants to query data from ${connectorLabel}. Use the available tools to fetch exactly what they need. Choose the most relevant tool and sensible parameters.`,
        },
        { role: 'user', content: query },
      ],
      tools: tools.map(t => ({
        type:     'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      })),
      tool_choice: 'auto',
      max_tokens:  500,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  const msg  = data.choices[0].message

  if (msg.tool_calls?.length > 0) {
    const tc = msg.tool_calls[0].function
    return {
      message:  msg.content || null,
      toolCall: { name: tc.name, params: JSON.parse(tc.arguments || '{}') },
    }
  }
  return { message: msg.content, toolCall: null }
}

/**
 * Calls the Anthropic Messages API with tool use.
 * Model: claude-haiku-4-5 — fast, accurate, great at tool selection.
 * Returns: { toolCall: { name, params } | null, message: string | null }
 */
async function callAnthropic({ apiKey, query, tools, connectorLabel }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     `You are a security analyst assistant. The user wants to query data from ${connectorLabel}. Use the available tools to fetch exactly what they need. Choose the most relevant tool and sensible parameters.`,
      messages: [{ role: 'user', content: query }],
      tools: tools.map(t => ({
        name:         t.name,
        description:  t.description,
        input_schema: t.parameters,
      })),
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Anthropic API error: ${response.status}`)
  }

  const data    = await response.json()
  const toolUse = data.content?.find(c => c.type === 'tool_use')

  if (toolUse) {
    return {
      message:  data.content.find(c => c.type === 'text')?.text || null,
      toolCall: { name: toolUse.name, params: toolUse.input || {} },
    }
  }
  return { message: data.content?.find(c => c.type === 'text')?.text || '', toolCall: null }
}

/**
 * Provider dispatcher — routes to the correct LLM API based on provider name.
 * Supported: 'openai' | 'anthropic'
 */
async function callLLM({ provider, apiKey, query, tools, connectorLabel }) {
  if (provider === 'openai')    return callOpenAI({ apiKey, query, tools, connectorLabel })
  if (provider === 'anthropic') return callAnthropic({ apiKey, query, tools, connectorLabel })
  throw new Error(`Unsupported provider: "${provider}". Use "openai" or "anthropic".`)
}

/**
 * Sends the fetched data back to the LLM for a plain-English summary.
 * Data is truncated to 2000 chars to stay within reasonable token limits.
 */
async function getAISummary({ provider, apiKey, query, toolCall, data }) {
  const dataPreview = JSON.stringify(data, null, 2).slice(0, 2000)
  const prompt = [
    `The user asked: "${query}"`,
    `The system called: ${toolCall.name}(${JSON.stringify(toolCall.params)})`,
    `Data returned:\n${dataPreview}`,
    `\nAs a security analyst, write a 2-3 sentence summary of the key findings.`,
    `Be specific — mention numbers, severity levels, and any immediate actions needed.`,
  ].join('\n')

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model:    'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a concise security analyst. Summarize findings clearly and specifically.' },
          { role: 'user',   content: prompt },
        ],
        max_tokens: 250,
      }),
    })
    const d = await res.json()
    return d.choices?.[0]?.message?.content || ''
  }

  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 250,
        system:     'You are a concise security analyst. Summarize findings clearly and specifically.',
        messages:   [{ role: 'user', content: prompt }],
      }),
    })
    const d = await res.json()
    return d.content?.find(c => c.type === 'text')?.text || ''
  }

  return ''
}

// ── AI Route ──────────────────────────────────────────────────────────────
//
// POST /api/ai/run
// Body: { provider, apiKey, connectorId, credentials, query }
//
// Response: {
//   success:   boolean
//   toolCall:  { name, params } | null   ← which op the AI picked
//   data:      any                        ← raw result from the connector
//   summary:   string                     ← AI plain-English explanation
//   aiMessage: string | null              ← raw LLM message (if no tool was called)
//   duration:  number (ms)
//   timestamp: string
// }
//
// ─────────────────────────────────────────────────────────────────────────
app.post('/api/ai/run', async (req, res) => {
  const { provider, apiKey, connectorId, credentials, query } = req.body

  if (!provider || !apiKey || !connectorId || !credentials || !query) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: provider, apiKey, connectorId, credentials, query',
    })
  }

  const def = registry[connectorId]
  if (!def) {
    return res.status(400).json({ success: false, error: `Unknown connector: ${connectorId}` })
  }

  const t0 = Date.now()

  try {
    // Step 1 — build LLM-compatible tool definitions from this connector's ops
    const tools = buildToolsForLLM(connectorId, def)

    // Step 2 — ask the LLM which operation to call and with what params
    const llmResult = await callLLM({ provider, apiKey, query, tools, connectorLabel: def.label })

    // If the LLM replied with text instead of a tool call, return it as-is
    if (!llmResult.toolCall) {
      return res.json({
        success:   true,
        toolCall:  null,
        data:      null,
        summary:   llmResult.message,
        aiMessage: llmResult.message,
        duration:  Date.now() - t0,
        timestamp: new Date().toISOString(),
      })
    }

    // Step 3 — execute the operation the LLM chose via the real SDK connector
    const connector = createConnector(connectorId, credentials)
    const raw  = await invokeOperation(connectorId, connector, llmResult.toolCall.name, llmResult.toolCall.params)
    const data = safeSerialize(raw)

    // Step 4 — ask the LLM to summarize the results in plain English
    const summary = await getAISummary({ provider, apiKey, query, toolCall: llmResult.toolCall, data })

    res.json({
      success:   true,
      toolCall:  llmResult.toolCall,
      data,
      summary,
      aiMessage: llmResult.message,
      duration:  Date.now() - t0,
      timestamp: new Date().toISOString(),
    })

  } catch (err) {
    res.json({
      success:   false,
      error:     err.message,
      duration:  Date.now() - t0,
      timestamp: new Date().toISOString(),
    })
  }
})

// ── Start ─────────────────────────────────────────────────
const server = app.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`
  const count = Object.keys(registry).length
  console.log(`\n  ┌─────────────────────────────────────────────────┐`)
  console.log(`  │   Complyment SDK Playground                     │`)
  console.log(`  │   ${url.padEnd(44)}│`)
  console.log(`  │   ${`${count} connectors loaded from registry`.padEnd(44)}│`)
  console.log(`  └─────────────────────────────────────────────────┘\n`)
})

server.on('error', (err) => {
  console.error(`\n  [error] ${err.message}\n`)
  process.exit(1)
})
