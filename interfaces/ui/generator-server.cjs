'use strict'
const express  = require('express')
const path     = require('path')
const fs       = require('fs')
const os       = require('os')
const multer   = require('multer').default || require('multer')
const { run }  = require('../../src/codegen/pipeline/orchestrator.cjs')
const { bus, EVENTS } = require('../../src/codegen/pipeline/event-bus.cjs')
const { getProviderName, setProvider } = require('../../src/codegen/providers/factory.cjs')
const { loadConfig } = require('../../src/codegen/config/config-loader.cjs')
const { preflight } = require('../../src/codegen/preflight.cjs')

const PORT = process.env.GENERATOR_PORT || 4001
const ROOT = path.resolve(__dirname, '..', '..')

const app = express()
app.use(express.json())
app.use('/vendor/three', express.static(path.join(ROOT, 'node_modules', 'three', 'build')))
app.get('/', (_, res) => res.redirect('/generator.html'))
app.use(express.static(path.join(ROOT, 'playground', 'public')))

// File upload handling
const upload = multer({ dest: os.tmpdir() })

// Active HITL response resolvers per run
const hitlResolvers = new Map()

// SSE clients per run
const sseClients = new Map()
const sseHistory = new Map()

function broadcast(runId, event, data) {
  const clients = sseClients.get(runId) || []
  const payload = `data: ${JSON.stringify({ event, ...data })}\n\n`
  if (!sseHistory.has(runId)) sseHistory.set(runId, [])
  sseHistory.get(runId).push(payload)
  clients.forEach(res => res.write(payload))
}

// ── Routes ──────────────────────────────────────────────────────

app.get('/api/registry', (_, res) => {
  const registryPath = path.join(ROOT, 'playground', 'connectors.registry.cjs')
  try {
    delete require.cache[require.resolve(registryPath)]
    const registry = require(registryPath)
    const ui = {}
    for (const [id, def] of Object.entries(registry)) {
      const { sdkClass: _, ...rest } = def
      ui[id] = { ...rest, ops: [] }
    }
    res.json(ui)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// List saved pipeline states for resume
app.get('/api/runs', (_, res) => {
  const stateDir = path.join(ROOT, '.connector-gen')
  if (!fs.existsSync(stateDir)) return res.json([])
  try {
    const files = fs.readdirSync(stateDir).filter(f => f.endsWith('.json'))
    const runs = files.map(f => {
      try {
        const state = JSON.parse(fs.readFileSync(path.join(stateDir, f), 'utf8'))
        return {
          connectorId:       state.connectorId,
          runId:             state.runId,
          lastCompletedStep: state.lastCompletedStep,
          connectorName:     state.steps?.validate?.connectorName || state.connectorId || f.replace('.json', ''),
          updatedAt:         fs.statSync(path.join(stateDir, f)).mtime.toISOString(),
        }
      } catch { return null }
    }).filter(Boolean)
    res.json(runs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Upload document and start pipeline
app.post('/api/generate', upload.single('document'), async (req, res) => {
  const { interactive = true, mode, stepConfig, provider, resume: resumeId } = req.body
  const runId = 'RUN-' + Math.random().toString(36).slice(2,7).toUpperCase()

  // Override AI provider if requested
  if (provider) {
    try { setProvider(provider) } catch (err) { return res.status(400).json({ error: err.message }) }
  }

  let docPath
  let docUrl
  let resume = resumeId || null

  if (resume) {
    // Resume mode — no doc needed; state file carries the document
  } else if (req.file) {
    docPath = req.file.path
  } else if (req.body.url) {
    docUrl = String(req.body.url)
  } else if (req.body.demo) {
    const demoText = `Demo API: ${req.body.demo}\nBase URL: https://api.example.com\nAuth: API Key\nOperations: getAssets, getVulnerabilities, getAlerts, getIncidents`
    docPath = path.join(os.tmpdir(), `demo-${runId}.txt`)
    fs.writeFileSync(docPath, demoText)
  } else {
    return res.status(400).json({ error: 'No document provided' })
  }

  const config = loadConfig(ROOT, {
    mode: interactive === false || interactive === 'false' ? 'auto' : 'interactive',
    'run-tests': req.body.runTests === true || req.body.runTests === 'true',
  })

  // Run preflight checks; block if git ops are requested without credentials
  const pf = preflight({ applyGit: config.applyGit, createPr: config.createPr })
  res.json({ runId, provider: getProviderName(), preflightWarnings: pf.warnings, preflightErrors: pf.errors })

  if (!pf.ok) {
    broadcast(runId, EVENTS.ABORT, { reason: `Preflight failed: ${pf.errors.join('; ')}` })
    return
  }

  run({
    runId,
    docPath,
    docUrl,
    resume,
    rootDir: ROOT,
    interactive: interactive !== false && interactive !== 'false',
    autoApprove: interactive === false || interactive === 'false',
    mode: mode || undefined,
    config,
    stepConfig: typeof stepConfig === 'string' ? JSON.parse(stepConfig) : (stepConfig || {}),
    waitForHuman: ({ step, summary }) => waitForHITL(runId, step, summary),
    onEvent: (event, data) => broadcast(runId, event, data),
  }).catch(err => broadcast(runId, EVENTS.ABORT, { reason: err.message }))
})

// SSE stream for a run
app.get('/api/stream/:runId', (req, res) => {
  const { runId } = req.params
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  if (!sseClients.has(runId)) sseClients.set(runId, [])
  sseClients.get(runId).push(res)
  for (const payload of sseHistory.get(runId) || []) res.write(payload)

  req.on('close', () => {
    const list = sseClients.get(runId) || []
    sseClients.set(runId, list.filter(r => r !== res))
  })
})

// HITL response from browser
app.post('/api/hitl/:runId', (req, res) => {
  const { runId } = req.params
  const { intent = 'APPROVE', instruction = '' } = req.body

  const resolve = hitlResolvers.get(runId)
  if (resolve) {
    hitlResolvers.delete(runId)
    resolve({ intent, instruction })
  }
  bus.emit(EVENTS.HITL_RESPONSE, { runId, intent, instruction })
  res.json({ ok: true })
})

// Provider info
app.get('/api/info', (req, res) => {
  res.json({ provider: getProviderName(), version: '0.3.5' })
})

app.listen(PORT, () => {
  console.log(`Generator UI server running at http://localhost:${PORT}`)
  console.log(`AI provider: ${getProviderName()}`)
})

function waitForHITL(runId, step, summary) {
  broadcast(runId, EVENTS.HITL_PROMPT, { step, message: summary })
  return new Promise(resolve => {
    hitlResolvers.set(runId, resolve)
  })
}
