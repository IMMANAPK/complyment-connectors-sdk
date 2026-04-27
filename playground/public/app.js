import { AI_EXAMPLES } from './config.js'
import { loadRegistry, runAIRequest, runConnectorOperation } from './api.js'
import { escapeHTML, healthColor, highlightJSON, initials, now } from './utils.js'

let registry = {}
let activeId = null
let activeOp = null
let mode = 'connector'
let running = false
let saveCreds = false
let saveAIKey = false
let activeProvider = 'openai'
let consoleTab = 'logs'
let lastResult = null
let logs = []
let traceSteps = []
let sidebarExpanded = false

function setSidebarExpanded(open) {
  sidebarExpanded = open
  document.getElementById('connectors-drawer')?.classList.toggle('expanded', sidebarExpanded)
  document.getElementById('connectors-toggle')?.classList.toggle('active', sidebarExpanded)
}

function bindDrawerControls() {
  document.getElementById('connectors-toggle').onclick = () => setSidebarExpanded(!sidebarExpanded)
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') setSidebarExpanded(false)
  })
}

function getAuthType(def) {
  if (def.fields?.some(f => /token/i.test(f.key))) return 'API Token'
  if (def.fields?.some(f => /secret|access/i.test(f.key))) return 'API Keys'
  return 'Credentials'
}

function getHealth(connectorId) {
  try {
    const saved = JSON.parse(localStorage.getItem(`sdk-health-${connectorId}`) || '{}')
    if (!saved.runs) return { runs: 0, successes: 0, score: null, lastStatus: 'unknown', lastChecked: null, lastOperation: null, lastError: null }
    return {
      ...saved,
      score: Math.round((saved.successes / saved.runs) * 100),
    }
  } catch {
    return { runs: 0, successes: 0, score: null, lastStatus: 'unknown', lastChecked: null, lastOperation: null, lastError: null }
  }
}

function saveHealth(connectorId, { success, operation, error }) {
  const current = getHealth(connectorId)
  const next = {
    runs: current.runs + 1,
    successes: current.successes + (success ? 1 : 0),
    lastStatus: success ? 'healthy' : 'error',
    lastChecked: new Date().toISOString(),
    lastOperation: operation,
    lastError: success ? null : error || 'Operation failed',
  }
  next.score = Math.round((next.successes / next.runs) * 100)
  localStorage.setItem(`sdk-health-${connectorId}`, JSON.stringify(next))
  return next
}

function formatHealth(health) {
  return health.score == null ? '--' : `${health.score}%`
}

function formatLastChecked(health) {
  if (!health.lastChecked) return 'Not tested'
  return new Date(health.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function applyTheme(theme) {
  const nextTheme = theme === 'light' ? 'light' : 'dark'
  document.documentElement.dataset.theme = nextTheme
  localStorage.setItem('sdk-playground-theme', nextTheme)
  const toggle = document.getElementById('theme-toggle')
  if (toggle) {
    toggle.title = nextTheme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'
    toggle.setAttribute('aria-label', toggle.title)
  }
}

function bindThemeToggle() {
  const requested = new URLSearchParams(window.location.search).get('theme')
  const saved = localStorage.getItem('sdk-playground-theme')
  const preferred = window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  applyTheme(requested || saved || preferred)
  document.getElementById('theme-toggle').onclick = () => {
    const current = document.documentElement.dataset.theme
    applyTheme(current === 'light' ? 'dark' : 'light')
  }
}

function addLog(level, source, message) {
  logs.push({ ts: now(), level, source, message })
  logs = logs.slice(-120)
  renderConsole()
}

function setStatus(state, text) {
  const el = document.getElementById('status-pill')
  el.className = `status-pill ${state || ''}`
  el.textContent = text
}

function getSaved(connectorId) {
  try { return JSON.parse(localStorage.getItem(`sdk-creds-${connectorId}`) || '{}') }
  catch { return {} }
}

function clearSaved(connectorId) {
  localStorage.removeItem(`sdk-creds-${connectorId}`)
  saveCreds = false
  renderWorkspace()
  addLog('info', 'SYS', `Cleared saved credentials for ${registry[connectorId]?.label || connectorId}`)
}

function getCredentials(prefix = 'cred') {
  const def = registry[activeId]
  const creds = {}
  def?.fields?.forEach(field => {
    const el = document.getElementById(`${prefix}-${field.key}`)
    if (el) creds[field.key] = el.value.trim()
  })
  return creds
}

function validateCredentials(creds) {
  const def = registry[activeId]
  return (def?.fields || []).filter(field => field.required && !creds[field.key])
}

function renderSidebar() {
  const list = document.getElementById('connector-list')
  list.innerHTML = Object.entries(registry).map(([id, def]) => {
    const health = getHealth(id)
    const color = def.color || '#0eb8a0'
    return `
      <button class="connector-row ${activeId === id && mode === 'connector' ? 'active' : ''}" type="button" data-connector="${escapeHTML(id)}">
        <span class="connector-avatar" style="background:${escapeHTML(color)}24;color:${escapeHTML(color)};border:1px solid ${escapeHTML(color)}40">${escapeHTML(initials(def.label))}</span>
        <span class="connector-info">
          <span class="connector-name">${escapeHTML(def.label)}</span>
          <span class="connector-tag">${escapeHTML(def.desc)}</span>
          <span class="health-line">
            <span class="health-track"><span class="health-fill" style="width:${health.score ?? 0}%;background:${healthColor(health.score)}"></span></span>
            <span class="health-value" style="color:${healthColor(health.score)}">${formatHealth(health)}</span>
          </span>
          <span class="connector-sync">${escapeHTML(formatLastChecked(health))} - ${escapeHTML(getAuthType(def))}</span>
        </span>
        ${activeId === id && mode === 'connector' ? '<span class="active-pulse"></span>' : ''}
      </button>
    `
  }).join('')

  document.querySelectorAll('[data-connector]').forEach(btn => {
    btn.addEventListener('click', () => selectConnector(btn.dataset.connector))
  })
  const aiButton = document.getElementById('ai-mode-button')
  aiButton.classList.toggle('active', mode === 'ai')
  aiButton.onclick = selectAI
  document.getElementById('connector-count').textContent = `${Object.keys(registry).length} loaded`
}

function selectConnector(id) {
  mode = 'connector'
  activeId = id
  activeOp = registry[id]?.ops?.[0]?.id || null
  saveCreds = false
  traceSteps = []
  lastResult = null
  renderAll()
  addLog('info', 'SYS', `Switched to ${registry[id]?.label || id}`)
}

function selectAI() {
  mode = 'ai'
  if (!activeId) activeId = Object.keys(registry)[0]
  traceSteps = []
  lastResult = null
  renderAll()
  addLog('info', 'SYS', 'Opened AI query mode')
}

function renderAll() {
  renderSidebar()
  renderWorkspace()
  renderExecPanel()
  renderConsole()
  setStatus('','IDLE')
}

function renderWorkspace() {
  if (mode === 'ai') return renderAIWorkspace()
  const def = registry[activeId]
  const health = getHealth(activeId)
  const saved = getSaved(activeId)
  const color = def.color || '#0eb8a0'
  document.documentElement.style.setProperty('--accent', color)
  document.documentElement.style.setProperty('--accent-soft', `${color}18`)
  document.documentElement.style.setProperty('--accent-border', `${color}45`)

  document.getElementById('workspace').innerHTML = `
    <div class="identity">
      <div class="identity-row">
        <div class="identity-avatar" style="background:${escapeHTML(color)}24;color:${escapeHTML(color)};border:1px solid ${escapeHTML(color)}45">${escapeHTML(initials(def.label))}</div>
        <div class="identity-copy">
          <div class="identity-name">${escapeHTML(def.label)}</div>
          <div class="identity-category">${escapeHTML(def.desc)}</div>
        </div>
        <div class="identity-actions">
          <button class="btn-small danger" type="button" id="clear-creds">Clear saved</button>
          <button class="btn-small" type="button" id="test-op">Test</button>
        </div>
      </div>
      <div class="stats-strip">
        <div class="stat-cell"><div class="stat-label">Health</div><div class="stat-value" style="color:${healthColor(health.score)}">${formatHealth(health)}</div><div class="stat-sub">actual run success</div></div>
        <div class="stat-cell"><div class="stat-label">Last Check</div><div class="stat-value" style="color:${health.lastChecked ? 'var(--green)' : 'var(--dim)'}">${escapeHTML(formatLastChecked(health))}</div><div class="stat-sub">${escapeHTML(health.lastOperation || 'run an operation')}</div></div>
        <div class="stat-cell"><div class="stat-label">Auth Type</div><div class="stat-value" style="color:#93c5fd">${escapeHTML(getAuthType(def))}</div><div class="stat-sub">${def.fields?.length || 0} fields</div></div>
        <div class="stat-cell"><div class="stat-label">Runs</div><div class="stat-value" style="color:${health.runs ? 'var(--text)' : 'var(--dim)'}">${health.successes}/${health.runs}</div><div class="stat-sub">successful / total</div></div>
        <div class="stat-cell"><div class="stat-label">Operations</div><div class="stat-value">${def.ops?.length || 0}</div><div class="stat-sub">registered</div></div>
        <div class="stat-cell"><div class="stat-label">Last Result</div><div class="stat-value" style="color:${health.lastStatus === 'error' ? 'var(--red)' : health.lastStatus === 'healthy' ? 'var(--green)' : 'var(--dim)'}">${escapeHTML(health.lastStatus)}</div><div class="stat-sub">${escapeHTML(health.lastError || 'no errors')}</div></div>
      </div>
    </div>
    <div class="form-scroll">
      <div class="section-title">Credentials</div>
      ${(def.fields || []).map((field, index) => `
        <div class="field">
          <label class="field-label" for="cred-${escapeHTML(field.key)}">
            ${escapeHTML(field.label)}
            ${field.required ? '<span class="required">*</span>' : ''}
            ${index === 0 ? `<span class="field-badge">${escapeHTML(getAuthType(def))}</span>` : ''}
          </label>
          <input class="line-input" id="cred-${escapeHTML(field.key)}" type="${escapeHTML(field.type || 'text')}" placeholder="${escapeHTML(field.placeholder || '')}" value="${escapeHTML(saved[field.key])}" autocomplete="off" spellcheck="false" />
          ${field.hint ? `<div class="field-hint">${escapeHTML(field.hint)}</div>` : ''}
        </div>
      `).join('')}
      <div class="section-title" style="margin-top:12px">Session</div>
      <div class="save-row">
        <button class="toggle ${saveCreds ? 'on' : ''}" type="button" id="save-toggle" aria-label="Toggle save credentials"><span class="toggle-knob"></span></button>
        <span>Save credentials locally</span>
      </div>
      <div class="warn-note">Only enable on a private dev machine. Tokens are stored in this browser.</div>
    </div>
  `
  document.getElementById('clear-creds').onclick = () => clearSaved(activeId)
  document.getElementById('test-op').onclick = () => {
    activeOp = 'testConnection'
    renderExecPanel()
  }
  document.getElementById('save-toggle').onclick = () => {
    saveCreds = !saveCreds
    document.getElementById('save-toggle').classList.toggle('on', saveCreds)
  }
}

function renderAIWorkspace() {
  const def = registry[activeId]
  const saved = getSaved(activeId)
  document.documentElement.style.setProperty('--accent', '#a855f7')
  document.documentElement.style.setProperty('--accent-soft', 'rgba(168,85,247,0.1)')
  document.documentElement.style.setProperty('--accent-border', 'rgba(168,85,247,0.28)')

  document.getElementById('workspace').innerHTML = `
    <div class="identity">
      <div class="identity-row">
        <div class="identity-avatar" style="background:rgba(168,85,247,0.15);color:#a855f7;border:1px solid rgba(168,85,247,0.35)">AI</div>
        <div class="identity-copy">
          <div class="identity-name">AI Query</div>
          <div class="identity-category">Pick a connector, ask in natural language, and run the selected SDK operation.</div>
        </div>
      </div>
      <div class="stats-strip">
        <div class="stat-cell"><div class="stat-label">Provider</div><div class="stat-value">${escapeHTML(activeProvider)}</div><div class="stat-sub">tool calling</div></div>
        <div class="stat-cell"><div class="stat-label">Connector</div><div class="stat-value">${escapeHTML(def.label)}</div><div class="stat-sub">${escapeHTML(def.desc)}</div></div>
        <div class="stat-cell"><div class="stat-label">Tools</div><div class="stat-value">${(def.ops || []).filter(op => op.id !== 'testConnection').length}</div><div class="stat-sub">from registry</div></div>
        <div class="stat-cell"><div class="stat-label">Credentials</div><div class="stat-value">${def.fields?.length || 0}</div><div class="stat-sub">required inputs</div></div>
        <div class="stat-cell"><div class="stat-label">Mode</div><div class="stat-value" style="color:var(--purple)">AI</div><div class="stat-sub">real backend</div></div>
        <div class="stat-cell"><div class="stat-label">Status</div><div class="stat-value" style="color:var(--green)">Ready</div><div class="stat-sub">manual run</div></div>
      </div>
    </div>
    <div class="form-scroll">
      <div class="section-title">LLM Provider</div>
      <div class="field">
        <label class="field-label" for="ai-provider">Provider <span class="required">*</span></label>
        <select class="line-select" id="ai-provider">
          <option value="openai" ${activeProvider === 'openai' ? 'selected' : ''}>OpenAI</option>
          <option value="anthropic" ${activeProvider === 'anthropic' ? 'selected' : ''}>Anthropic / Claude</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="ai-key">API Key <span class="required">*</span></label>
        <input class="line-input" id="ai-key" type="password" placeholder="Paste API key" value="${escapeHTML(localStorage.getItem(`sdk-ai-key-${activeProvider}`) || '')}" autocomplete="off" spellcheck="false" />
      </div>
      <div class="save-row">
        <button class="toggle ${saveAIKey ? 'on' : ''}" type="button" id="ai-key-toggle" aria-label="Toggle save AI key"><span class="toggle-knob"></span></button>
        <span>Save AI key locally</span>
      </div>
      <div class="warn-note">Only enable on a private dev machine.</div>

      <div class="section-title" style="margin-top:20px">Connector Credentials</div>
      <div class="field">
        <label class="field-label" for="ai-connector">Connector <span class="required">*</span></label>
        <select class="line-select" id="ai-connector">
          ${Object.entries(registry).map(([id, item]) => `<option value="${escapeHTML(id)}" ${id === activeId ? 'selected' : ''}>${escapeHTML(item.label)}</option>`).join('')}
        </select>
      </div>
      ${(def.fields || []).map(field => `
        <div class="field">
          <label class="field-label" for="ai-cred-${escapeHTML(field.key)}">${escapeHTML(field.label)}${field.required ? '<span class="required">*</span>' : ''}</label>
          <input class="line-input" id="ai-cred-${escapeHTML(field.key)}" type="${escapeHTML(field.type || 'text')}" placeholder="${escapeHTML(field.placeholder || '')}" value="${escapeHTML(saved[field.key])}" autocomplete="off" spellcheck="false" />
        </div>
      `).join('')}
    </div>
  `
  document.getElementById('ai-provider').onchange = (event) => {
    activeProvider = event.target.value
    renderWorkspace()
  }
  document.getElementById('ai-connector').onchange = (event) => {
    activeId = event.target.value
    renderAll()
  }
  document.getElementById('ai-key-toggle').onclick = () => {
    saveAIKey = !saveAIKey
    document.getElementById('ai-key-toggle').classList.toggle('on', saveAIKey)
  }
}

function renderExecPanel() {
  if (mode === 'ai') return renderAIExecPanel()
  const def = registry[activeId]
  const op = (def.ops || []).find(item => item.id === activeOp) || def.ops?.[0]
  activeOp = op?.id || null
  document.getElementById('exec-panel').innerHTML = `
    <div class="exec-scroll">
      <div class="exec-label">Operation</div>
      <div class="op-list">
        ${(def.ops || []).map(item => `
          <button class="op-item ${item.id === activeOp ? 'active' : ''}" type="button" data-op="${escapeHTML(item.id)}">
            <span>${escapeHTML(item.label || item.id)}</span><span class="op-arrow">></span>
          </button>
        `).join('')}
      </div>
      <div class="op-desc">${escapeHTML(op?.desc || '')}</div>
      <div class="exec-label">Parameters (JSON)</div>
      <textarea class="json-editor" id="params-editor" spellcheck="false">${escapeHTML(op?.params === null ? '{}' : JSON.stringify(op?.params || {}, null, 2))}</textarea>
    </div>
    <div class="run-zone">
      <button class="run-btn" type="button" id="run-btn">${running ? '<span class="spinner"></span> Executing...' : `Run ${escapeHTML(op?.label || 'Operation')}`}</button>
      <div style="height:14px"></div>
      <div class="exec-label">Execution State</div>
      <div class="state-list" id="state-list">${renderTrace()}</div>
    </div>
  `
  document.querySelectorAll('[data-op]').forEach(btn => {
    btn.onclick = () => {
      activeOp = btn.dataset.op
      traceSteps = []
      renderExecPanel()
    }
  })
  document.getElementById('run-btn').onclick = runOperation
}

function renderAIExecPanel() {
  const examples = AI_EXAMPLES[activeId] || []
  document.getElementById('exec-panel').innerHTML = `
    <div class="exec-scroll">
      <div class="exec-label">Natural Language Query</div>
      <textarea class="query-box" id="ai-query" placeholder="Example: Show me all critical vulnerabilities from the last 30 days"></textarea>
      <div class="op-desc">The AI sees registered operations from connectors.registry.cjs and chooses the best SDK method.</div>
      <div class="exec-label">Examples</div>
      <div class="chip-row">
        ${examples.map(text => `<button class="chip" type="button" data-example="${escapeHTML(text)}">${escapeHTML(text)}</button>`).join('')}
      </div>
    </div>
    <div class="run-zone">
      <button class="run-btn" type="button" id="ai-run-btn">${running ? '<span class="spinner"></span> Thinking...' : 'Ask AI'}</button>
      <div style="height:14px"></div>
      <div class="exec-label">Execution State</div>
      <div class="state-list" id="state-list">${renderTrace()}</div>
    </div>
  `
  document.querySelectorAll('[data-example]').forEach(btn => {
    btn.onclick = () => { document.getElementById('ai-query').value = btn.dataset.example }
  })
  document.getElementById('ai-run-btn').onclick = runAIQuery
}

function renderTrace() {
  if (!traceSteps.length) {
    return '<div class="state-step"><span class="step-dot">-</span><span>Run an operation to trace execution</span></div>'
  }
  return traceSteps.map((step, index) => `
    <div class="state-step ${escapeHTML(step.state)}">
      <span class="step-dot">${step.state === 'done' ? 'v' : step.state === 'error' ? 'x' : step.state === 'running' ? '*' : index + 1}</span>
      <span>${escapeHTML(step.label)}</span>
    </div>
  `).join('')
}

function setTrace(labels, activeIndex, failed) {
  traceSteps = labels.map((label, index) => ({
    label,
    state: failed && index === activeIndex ? 'error' : index < activeIndex ? 'done' : index === activeIndex ? 'running' : 'pending',
  }))
  const list = document.getElementById('state-list')
  if (list) list.innerHTML = renderTrace()
}

async function runOperation() {
  if (running) return
  const def = registry[activeId]
  const creds = getCredentials('cred')
  const missing = validateCredentials(creds)
  if (missing.length) return alert(`Please fill in: ${missing.map(f => f.label).join(', ')}`)

  let params = {}
  try {
    params = JSON.parse(document.getElementById('params-editor').value.trim() || '{}')
  } catch {
    return alert('Invalid JSON in Parameters field')
  }

  if (saveCreds) localStorage.setItem(`sdk-creds-${activeId}`, JSON.stringify(creds))
  else localStorage.removeItem(`sdk-creds-${activeId}`)

  running = true
  renderExecPanel()
  setStatus('run', 'EXEC')
  addLog('info', def.label, `Running ${activeOp}`)
  const labels = ['Validate inputs', 'Create connector', 'Call SDK operation', 'Serialize response']
  setTrace(labels, 0)
  const t0 = Date.now()

  try {
    setTrace(labels, 1)
    addLog('auth', def.label, 'Credentials prepared for connector instance')
    setTrace(labels, 2)
    const data = await runConnectorOperation({ connector: activeId, credentials: creds, operation: activeOp, params })
    lastResult = data
    saveHealth(activeId, { success: data.success, operation: activeOp, error: data.error })
    setTrace(labels, 3, !data.success)
    if (data.success) {
      traceSteps = labels.map(label => ({ label, state: 'done' }))
      addLog('done', def.label, `${activeOp} completed in ${data.duration}ms`)
      setStatus('ok', '200 OK')
    } else {
      addLog('err', def.label, data.error || 'Operation failed')
      setStatus('err', 'ERR')
    }
  } catch (err) {
    lastResult = { success: false, error: err.message, duration: Date.now() - t0, timestamp: new Date().toISOString() }
    saveHealth(activeId, { success: false, operation: activeOp, error: err.message })
    setTrace(labels, 2, true)
    addLog('err', def.label, err.message)
    setStatus('err', 'ERR')
  } finally {
    running = false
    renderSidebar()
    renderExecPanel()
    renderConsole()
  }
}

async function runAIQuery() {
  if (running) return
  const def = registry[activeId]
  const provider = activeProvider
  const apiKey = document.getElementById('ai-key')?.value.trim()
  const query = document.getElementById('ai-query')?.value.trim()
  const credentials = getCredentials('ai-cred')
  const missing = validateCredentials(credentials)
  if (!apiKey) return alert('Please enter an API key')
  if (!query) return alert('Please enter a question')
  if (missing.length) return alert(`Please fill in: ${missing.map(f => f.label).join(', ')}`)

  if (saveAIKey) localStorage.setItem(`sdk-ai-key-${provider}`, apiKey)
  else localStorage.removeItem(`sdk-ai-key-${provider}`)

  running = true
  renderExecPanel()
  setStatus('run', 'AI')
  addLog('info', 'AI', `Asking ${provider} about ${def.label}`)
  const labels = ['Build AI tools', 'Select SDK operation', 'Run connector', 'Summarize result']
  setTrace(labels, 0)

  try {
    setTrace(labels, 1)
    const data = await runAIRequest({ provider, apiKey, connectorId: activeId, credentials, query })
    lastResult = data
    if (data.toolCall) {
      saveHealth(activeId, { success: data.success, operation: data.toolCall.name, error: data.error })
    }
    if (data.success) {
      traceSteps = labels.map(label => ({ label, state: 'done' }))
      const tool = data.toolCall ? `${data.toolCall.name}()` : 'no tool'
      addLog('done', 'AI', `AI completed via ${tool} in ${data.duration}ms`)
      setStatus('ok', 'AI OK')
    } else {
      setTrace(labels, 1, true)
      addLog('err', 'AI', data.error || 'AI query failed')
      setStatus('err', 'AI ERR')
    }
  } catch (err) {
    lastResult = { success: false, error: err.message, timestamp: new Date().toISOString() }
    setTrace(labels, 1, true)
    addLog('err', 'AI', err.message)
    setStatus('err', 'AI ERR')
  } finally {
    running = false
    renderSidebar()
    renderExecPanel()
    renderConsole()
  }
}

function renderConsole() {
  const body = document.getElementById('console-body')
  if (!body) return
  if (consoleTab === 'logs') {
    body.innerHTML = logs.length ? logs.map(log => `
      <div class="log-line">
        <span class="log-ts">${escapeHTML(log.ts)}</span>
        <span class="log-lvl log-${escapeHTML(log.level)}">${escapeHTML(log.level.toUpperCase())}</span>
        <span class="log-src">[${escapeHTML(log.source)}]</span>
        <span class="log-msg">${escapeHTML(log.message)}</span>
      </div>
    `).join('') : '<div class="empty-state">Playground ready. Select a connector and run an operation.</div>'
  } else if (consoleTab === 'response') {
    body.innerHTML = lastResult ? renderResultView(lastResult) : '<div class="empty-state">No response yet.</div>'
  } else {
    body.innerHTML = traceSteps.length ? renderTrace() : '<div class="empty-state">Execution trace appears after a run.</div>'
  }
  body.scrollTop = body.scrollHeight
}

function renderResultView(data) {
  if (mode === 'ai' && data?.summary) {
    return `
      <div class="ai-summary">${escapeHTML(data.summary)}</div>
      <div class="json-view">${highlightJSON(data)}</div>
    `
  }
  return `<div class="json-view">${highlightJSON(data)}</div>`
}

function bindConsoleControls() {
  document.querySelectorAll('.console-tab').forEach(tab => {
    tab.onclick = () => {
      consoleTab = tab.dataset.tab
      document.querySelectorAll('.console-tab').forEach(item => item.classList.toggle('active', item === tab))
      renderConsole()
    }
  })
  document.getElementById('clear-console').onclick = () => {
    logs = []
    traceSteps = []
    lastResult = null
    setStatus('', 'IDLE')
    renderConsole()
    renderExecPanel()
  }
  document.getElementById('copy-console').onclick = () => {
    const text = consoleTab === 'response'
      ? JSON.stringify(lastResult || {}, null, 2)
      : logs.map(log => `${log.ts} ${log.level.toUpperCase()} [${log.source}] ${log.message}`).join('\n')
    navigator.clipboard?.writeText(text).catch(() => {})
  }
}

async function init() {
  bindThemeToggle()
  bindDrawerControls()
  bindConsoleControls()
  try {
    registry = await loadRegistry()
    activeId = Object.keys(registry)[0]
    activeOp = registry[activeId]?.ops?.[0]?.id || null
    addLog('info', 'SYS', `Registry loaded - ${Object.keys(registry).length} connectors found`)
    renderAll()
  } catch (err) {
    document.getElementById('workspace').innerHTML = `<div class="empty-state">Failed to load registry: ${escapeHTML(err.message)}</div>`
    document.getElementById('exec-panel').innerHTML = ''
    addLog('err', 'SYS', err.message)
  }
}

init()
