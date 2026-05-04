import * as THREE from '/vendor/three/three.module.js'
import { escapeHTML } from './utils.js'

// ── Pipeline steps ────────────────────────────────────────────
const STEPS = [
  { id: 'validate',  title: 'Document Validation',  sub: 'Check API doc quality'        },
  { id: 'branch',    title: 'Branch Management',     sub: 'Create or pull git branch'    },
  { id: 'analyze',   title: 'Analysis',              sub: 'New connector or update?'     },
  { id: 'codegen',   title: 'Code Generation',       sub: 'AI generates connector files' },
  { id: 'typecheck', title: 'Type Check',            sub: 'Validate TypeScript compiles' },
  { id: 'tests',     title: 'Playwright Tests',      sub: 'Run connector test suite'     },
  { id: 'review',    title: 'Code Review',           sub: 'AI quality gate'              },
  { id: 'mr',        title: 'Pull Request',          sub: 'Create GitHub PR'             },
  { id: 'notify',    title: 'Notification',          sub: 'Notify assignee'              },
]

// ── Demo profiles ─────────────────────────────────────────────
const PROFILES = {
  'CrowdStrike Falcon': {
    name: 'CrowdStrike Falcon', mode: 'Create', confidence: '92%',
    branch: 'connector/crowdstrike', auth: 'API key (X-CrowdStrike-API-Key)',
    baseUrl: 'https://api.crowdstrike.com',
    ops: ['getIncidents','getDevices','getAlerts','getDetections','getHosts','getVulnerabilities'],
    files: ['CrowdStrikeFalconConnector.ts','types.ts','constants.ts','parser.ts','index.ts','connectors.registry.cjs'],
  },
  'Qualys VMDR': {
    name: 'Qualys VMDR', mode: 'Update', confidence: '88%',
    branch: 'connector/qualys', auth: 'Basic Auth (username + password)',
    baseUrl: 'https://qualysapi.qualys.com',
    ops: ['getAssets','launchScan','getScanStatus','getVulnerabilities','getPatchReport'],
    files: ['QualysConnector.ts','types.ts','constants.ts','parser.ts','connectors.spec.ts'],
  },
  'SentinelOne Singularity': {
    name: 'SentinelOne Singularity', mode: 'Create', confidence: '91%',
    branch: 'connector/sentinelone-v2', auth: 'Bearer token',
    baseUrl: 'https://usea1-partners.sentinelone.net',
    ops: ['getThreats','getAgents','getSites','isolateAgent','mitigateThreat'],
    files: ['SentinelOneSingularityConnector.ts','types.ts','constants.ts','parser.ts','index.ts'],
  },
}

// AI message per step
const MSG = {
  validate:  p => `Document validated. Found ${p.ops.length} operations, ${p.auth}. Confidence: ${p.confidence}.`,
  branch:    p => p.mode === 'Update' ? `Branch ${p.branch} exists — pulled latest, no conflicts.` : `Branch doesn't exist — will create ${p.branch} from main.`,
  analyze:   p => `Mode: ${p.mode}. ${p.mode === 'Update' ? 'Diff will be applied surgically.' : 'Generating all 5 files from scratch.'}`,
  codegen:   p => `Code generation complete. ${p.files.length} files ready. Running typecheck next.`,
  typecheck: () => 'TypeScript check passed — 0 errors across all generated files.',
  tests:     p => `Tests complete. 3 passed, 1 skipped (missing live credential for ${p.ops.at(-1)}).`,
  review:    () => 'Code review complete. Score: 87/100. 2 doc warnings — no blockers.',
  mr:        p => `PR draft ready: "${p.mode === 'Update' ? 'update' : 'feat'}(connector): ${p.name}". Confirm to create.`,
  notify:    () => 'Notification sent to connector-reviewers@skill-mine.com and #sdk-reviews.',
}

// ── State ─────────────────────────────────────────────────────
const S = {
  step: 0, approved: -1,
  interactive: true, started: false,
  liveRun: false, sourceKind: 'demo',
  profile: PROFILES['CrowdStrike Falcon'],
  msgs: [],
  rawLogs: [],
  runId: 'RUN-' + Math.random().toString(36).slice(2,7).toUpperCase(),
  // Per-step HITL override: { stepId: { interactive: bool } }
  stepConfigOverrides: {},
  lowPower: false,
  skippedSteps: new Set(),
}

let mini = null

// ── Full-screen background 3D scene ───────────────────────────
function initBgScene() {
  const canvas = document.getElementById('bg-canvas')
  if (!canvas) return null

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const cam   = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 120)
  cam.position.z = 26

  // ── Large glowing orbs ──────────────────────────────────
  const ORB_DEFS = [
    { c: 0x00cfb0, r: 5.0, x: -12, y:  6, z: -18, spd: 0.16, ph: 0.0 },
    { c: 0x818cf8, r: 4.2, x:  14, y: -5, z: -22, spd: 0.11, ph: 1.8 },
    { c: 0x0ea5e9, r: 3.4, x:   2, y: 10, z: -28, spd: 0.20, ph: 3.2 },
    { c: 0x00cfb0, r: 2.8, x: -16, y: -9, z: -12, spd: 0.14, ph: 4.5 },
    { c: 0xf59e0b, r: 2.2, x:  16, y:  9, z: -14, spd: 0.18, ph: 6.0 },
  ]

  const orbs = ORB_DEFS.map(d => {
    const inner = new THREE.Mesh(
      new THREE.SphereGeometry(d.r, 32, 24),
      new THREE.MeshBasicMaterial({ color: d.c, transparent: true, opacity: 0.10 })
    )
    inner.position.set(d.x, d.y, d.z)
    scene.add(inner)

    const outer = new THREE.Mesh(
      new THREE.SphereGeometry(d.r * 2.4, 16, 12),
      new THREE.MeshBasicMaterial({ color: d.c, transparent: true, opacity: 0.040 })
    )
    outer.position.set(d.x, d.y, d.z)
    scene.add(outer)

    return { inner, outer, bx: d.x, by: d.y, bz: d.z, spd: d.spd, ph: d.ph }
  })

  // ── Particle field (GPU points) ─────────────────────────
  const PTCL  = 260
  const ptPos = new Float32Array(PTCL * 3)
  const ptVel = Array.from({ length: PTCL }, () => ({
    vx: (Math.random() - 0.5) * 0.004,
    vy: (Math.random() - 0.5) * 0.003,
    ph: Math.random() * Math.PI * 2,
  }))
  for (let i = 0; i < PTCL * 3; i += 3) {
    ptPos[i]   = (Math.random() - 0.5) * 52
    ptPos[i+1] = (Math.random() - 0.5) * 30
    ptPos[i+2] = (Math.random() - 0.5) * 10 - 10
  }
  const ptGeo = new THREE.BufferGeometry()
  ptGeo.setAttribute('position', new THREE.BufferAttribute(ptPos, 3))
  const ptMat = new THREE.PointsMaterial({ color: 0x00cfb0, size: 0.07, transparent: true, opacity: 0.30 })
  scene.add(new THREE.Points(ptGeo, ptMat))

  // ── Floating ring ───────────────────────────────────────
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(6, 0.04, 8, 120),
    new THREE.MeshBasicMaterial({ color: 0x00cfb0, transparent: true, opacity: 0.12 })
  )
  ring.rotation.x = Math.PI / 3
  ring.position.set(-4, 2, -16)
  scene.add(ring)

  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(4.2, 0.03, 8, 90),
    new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.09 })
  )
  ring2.rotation.x = -Math.PI / 4
  ring2.position.set(8, -3, -20)
  scene.add(ring2)

  // ── Resize ──────────────────────────────────────────────
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false)
    cam.aspect = innerWidth / innerHeight
    cam.updateProjectionMatrix()
  }

  // ── Theme adaptation ────────────────────────────────────
  function updateTheme(isLight) {
    orbs.forEach(o => {
      o.inner.material.opacity = isLight ? 0.13 : 0.10
      o.outer.material.opacity = isLight ? 0.055 : 0.040
    })
    ptMat.opacity  = isLight ? 0.18 : 0.30
    ring.material.opacity  = isLight ? 0.09 : 0.12
    ring2.material.opacity = isLight ? 0.07 : 0.09
  }

  // ── Step pulse: brighten orbs as pipeline progresses ───
  function updateStep(active, approved) {
    const progress = Math.max(0, approved + 1) / STEPS.length
    orbs[0].inner.material.opacity = 0.10 + progress * 0.12
    orbs[0].outer.material.opacity = 0.040 + progress * 0.06
  }

  // ── Animate ─────────────────────────────────────────────
  const clock = new THREE.Clock()
  let rafId = null
  function tick() {
    const t = clock.getElapsedTime()
    const pos = ptGeo.attributes.position.array

    // Drift orbs in slow Lissajous paths
    orbs.forEach(o => {
      o.inner.position.x = o.bx + Math.sin(t * o.spd + o.ph) * 3.5
      o.inner.position.y = o.by + Math.cos(t * o.spd * 0.65 + o.ph) * 2.2
      o.outer.position.copy(o.inner.position)
      const breathe = 1 + Math.sin(t * 0.55 + o.ph) * 0.055
      o.inner.scale.setScalar(breathe)
      o.outer.scale.setScalar(breathe)
    })

    // Drift particles, wrap edges
    for (let i = 0; i < PTCL; i++) {
      const v = ptVel[i]
      pos[i*3]   += v.vx
      pos[i*3+1] += v.vy + Math.sin(t * 0.28 + v.ph) * 0.0006
      if (pos[i*3]   >  26)  pos[i*3]   = -26
      if (pos[i*3]   < -26)  pos[i*3]   =  26
      if (pos[i*3+1] >  15)  pos[i*3+1] = -15
      if (pos[i*3+1] < -15)  pos[i*3+1] =  15
    }
    ptGeo.attributes.position.needsUpdate = true

    // Slowly spin rings
    ring.rotation.z  += 0.0008
    ring2.rotation.z -= 0.0005

    // Very slow camera parallax drift
    cam.position.x = Math.sin(t * 0.06) * 1.4
    cam.position.y = Math.cos(t * 0.04) * 0.8
    cam.lookAt(0, 0, 0)

    renderer.render(scene, cam)
    rafId = requestAnimationFrame(tick)
  }

  function stop() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
    canvas.style.display = 'none'
  }
  function start() {
    if (rafId !== null) return
    canvas.style.display = ''
    clock.start()
    rafId = requestAnimationFrame(tick)
  }

  resize(); rafId = requestAnimationFrame(tick)
  window.addEventListener('resize', resize)
  return { updateStep, updateTheme, stop, start }
}

// ── Output builders ───────────────────────────────────────────
function facts(pairs) {
  return `<div class="facts">${pairs.map(([l,v,cls]) =>
    `<div class="fact"><label>${l}</label><strong${cls ? ` class="${cls}"` : ''}>${v}</strong></div>`
  ).join('')}</div>`
}

function langForFile(filename) {
  const ext = String(filename || '').split('.').pop().toLowerCase()
  if (['ts','tsx'].includes(ext)) return 'language-typescript'
  if (['js','cjs','mjs'].includes(ext)) return 'language-javascript'
  if (ext === 'json') return 'language-json'
  if (['sh','bash'].includes(ext) || filename.includes('git-commands')) return 'language-bash'
  if (['yaml','yml'].includes(ext)) return 'language-yaml'
  if (ext === 'md' || filename.includes('.md')) return 'language-markdown'
  if (ext === 'txt') return 'language-plaintext'
  return 'language-plaintext'
}

function codeBlock(filename, tag, code) {
  const lang = langForFile(filename)
  return `<div class="code-blk">
    <div class="code-hd">
      <span class="code-fn">${escapeHTML(filename)}</span>
      <span class="code-tag">${escapeHTML(tag)}</span>
    </div>
    <pre><code class="${lang}">${code}</code></pre>
  </div>`
}

function diffTable(changes) {
  if (!changes || !changes.length) return ''
  const icon = { breaking: '⚠', additive: '+', removed: '−', type_changed: '≈', field_added: '+', field_removed: '−' }
  const cls  = { breaking: 'diff-break', additive: 'diff-add', removed: 'diff-rem', type_changed: 'diff-chg', field_added: 'diff-add', field_removed: 'diff-rem' }
  return `<div class="diff-viewer">${changes.map(c => `
    <div class="diff-entry ${cls[c.severity] || cls[c.type] || ''}">
      <span class="diff-icon">${icon[c.severity] || icon[c.type] || '~'}</span>
      <span class="diff-name">${escapeHTML(c.name || '')}</span>
      <span class="diff-type">${escapeHTML(c.type || '')}</span>
      <span class="diff-what">${escapeHTML(c.what || '')}</span>
      <span class="diff-sev diff-sev--${c.severity || ''}">${escapeHTML(c.severity || '')}</span>
    </div>`).join('')}</div>`
}

function highlightCode() {
  if (typeof hljs === 'undefined') return
  document.getElementById('out-card')?.querySelectorAll('pre code').forEach(el => {
    try { hljs.highlightElement(el) } catch { /* skip */ }
  })
}

function table(heads, rows) {
  return `<table class="dtbl">
    <thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`
}

function stepOutputFor(uiStepId) {
  const map = { analyze: 'conflict', mr: 'pr' }
  return S.stepOutputs?.[uiStepId] || S.stepOutputs?.[map[uiStepId]]
}

function renderLiveOutput(stepId, output) {
  if (!output || typeof output !== 'object') return ''
  if (stepId === 'validate') {
    return facts([
      ['Connector', escapeHTML(output.connectorName)],
      ['Auth', escapeHTML(output.authType || output.authDetails || '—')],
      ['Base URL', escapeHTML(output.baseUrl || '—')],
      ['Operations', `${(output.operationsFound || []).length} detected`],
      ['Confidence', `${escapeHTML(output.confidence ?? '—')}%`],
      ['Verdict', `<span class="${output.verdict === 'PASS' ? 'ok' : 'warn'}">${escapeHTML(output.verdict || '—')}</span>`, ''],
    ]) + codeBlock('validation-report.json', 'live output', escapeHTML(JSON.stringify(output, null, 2)))
  }

  if (stepId === 'branch') {
    return facts([
      ['Branch', escapeHTML(output.branch || '—')],
      ['Action', escapeHTML(output.action || '—')],
      ['Existing', output.exists ? 'Yes' : 'No'],
      ['Conflicts', output.hadConflicts ? '<span class="warn">Detected</span>' : '<span class="ok">None</span>', ''],
    ]) + codeBlock('branch-result.json', output.dryRun ? 'dry run' : 'live output', escapeHTML(JSON.stringify(output, null, 2)))
  }

  if (stepId === 'analyze') {
    const changes = output.changelog?.changes || []
    return facts([
      ['Mode', escapeHTML(output.mode || '—')],
      ['Connector ID', escapeHTML(output.connectorId || '—')],
      ['Existing files', String(Object.keys(output.existingFiles || {}).length)],
      ['Changes', output.changelog?.summary ? escapeHTML(output.changelog.summary) : `${changes.length} detected`],
    ]) + (changes.length
      ? diffTable(changes)
      : codeBlock('analysis.json', 'live output', escapeHTML(JSON.stringify(output, null, 2))))
  }

  if (stepId === 'codegen') {
    const previews = output.writeResult?.previews || []
    const first = previews[0]
    return facts([
      ['Class', escapeHTML(output.className || '—')],
      ['Connector ID', escapeHTML(output.connectorId || '—')],
      ['Files', String((output.writeResult?.files || []).length)],
      ['Write mode', output.dryRun ? 'Preview only' : 'Written to disk'],
    ]) + (first
      ? codeBlock(first.path.split('/').pop(), output.dryRun ? 'preview' : 'written', escapeHTML(first.content))
      : codeBlock('codegen-result.json', 'live output', escapeHTML(JSON.stringify(output, null, 2))))
  }

  if (stepId === 'typecheck') {
    if (output.skipped) return `<div class="skip-notice">
      <span class="skip-icon">–</span>
      <div><strong>Skipped</strong><span>${escapeHTML(output.summary || 'Disabled in dry-run mode')}</span></div>
    </div>`
    return facts([
      ['Status', output.passed ? '<span class="ok">Passed</span>' : '<span class="fail">Failed</span>', ''],
      ['Attempts', String(output.attempts ?? 0)],
      ['Summary', escapeHTML(output.summary || '—')],
    ]) + codeBlock('typecheck-result.json', 'live output', escapeHTML(JSON.stringify(output, null, 2)))
  }

  if (stepId === 'tests') {
    if (output.skipped) return `<div class="skip-notice">
      <span class="skip-icon">–</span>
      <div><strong>Tests skipped</strong><span>${escapeHTML(output.summary || 'Enable "Run Playwright Tests" in the upload options.')}</span></div>
    </div>`
    return facts([
      ['Status', output.passed ? '<span class="ok">Passed</span>' : '<span class="fail">Failed</span>', ''],
      ['Attempts', String(output.attempts ?? 0)],
      ['Summary', escapeHTML(output.summary || '—')],
    ]) + codeBlock('test-result.json', 'live output', escapeHTML(JSON.stringify(output, null, 2)))
  }

  if (stepId === 'review') {
    const issues = output.issues || []
    return `<div class="score-row">
      <div class="score-ring"><strong>${escapeHTML(output.score ?? '—')}</strong></div>
      <div class="score-body">
        <strong>${escapeHTML(output.verdict || 'Review complete')}</strong>
        <p>${escapeHTML(output.summary || 'Live code review output.')}</p>
      </div>
    </div>` + (issues.length
      ? table(['Severity', 'File', 'Issue'], issues.map(i => [escapeHTML(i.severity), escapeHTML(i.file || '—'), escapeHTML(i.message)]))
      : codeBlock('review-result.json', 'live output', escapeHTML(JSON.stringify(output, null, 2))))
  }

  if (stepId === 'mr') {
    return facts([
      ['Title', escapeHTML(output.title || '—')],
      ['Branch', escapeHTML(output.branch || '—')],
      ['Status', output.url ? 'Created' : 'Draft / dry-run'],
      ['URL', output.url ? escapeHTML(output.url) : '—'],
    ]) + codeBlock('pull-request-body.md', output.dryRun ? 'draft' : 'live output', escapeHTML(output.draftBody || JSON.stringify(output, null, 2)))
  }

  if (stepId === 'notify') {
    const rows = Array.isArray(output) ? output : [output]
    return table(['Channel', 'Status', 'Details'], rows.map(r => [
      escapeHTML(r.channel || '—'),
      escapeHTML(r.status || '—'),
      escapeHTML(r.message || r.error || r.to || '—'),
    ]))
  }

  return codeBlock(`${stepId}.json`, 'live output', escapeHTML(JSON.stringify(output, null, 2)))
}

const OUT = {
  validate(p) {
    return facts([
      ['Connector', escapeHTML(p.name)],
      ['Auth', escapeHTML(p.auth)],
      ['Base URL', escapeHTML(p.baseUrl)],
      ['Operations', `${p.ops.length} detected`],
      ['Confidence', escapeHTML(p.confidence)],
      ['Verdict', '<span class="ok">PASS</span>', ''],
    ]) + codeBlock('validation-report.json', 'AI output', escapeHTML(JSON.stringify({
      isApiDocument: true, connectorName: p.name, authType: p.auth,
      operationsFound: p.ops, baseUrl: p.baseUrl,
      confidence: parseInt(p.confidence), missingFields: [], verdict: 'PASS',
    }, null, 2)))
  },
  branch(p) {
    const isUp = p.mode === 'Update'
    const cmd  = isUp
      ? `git fetch origin ${p.branch}\ngit checkout ${p.branch}\ngit pull origin ${p.branch}`
      : `git checkout main\ngit pull origin main\ngit checkout -b ${p.branch}`
    return facts([
      ['Branch', escapeHTML(p.branch)],
      ['Base', 'origin/main'],
      ['Exists', isUp ? 'Yes — pulled latest' : 'No — creating new'],
      ['Conflicts', '<span class="ok">None detected</span>', ''],
    ]) + codeBlock('git-commands.sh', 'dry run', escapeHTML(cmd))
  },
  analyze(p) {
    return facts([
      ['Mode', escapeHTML(p.mode)],
      ['Connector', escapeHTML(p.name)],
      ['Files to generate', String(p.files.length)],
      ['Strategy', p.mode === 'Update' ? 'Diff + surgical edits' : 'Full generation'],
    ])
  },
  codegen(p) {
    const cls = p.name.replace(/[^A-Za-z0-9]/g, '') + 'Connector'
    const methods = p.ops.slice(0,3).map(op =>
      `  async ${op}(params = {}) {\n    return this.get(API_PATHS.${op.toUpperCase()}, params)\n  }`
    ).join('\n\n')
    return facts([
      ['Class', escapeHTML(cls)],
      ['Files generated', '5 connector files'],
      ['Registry patched', 'connectors.registry.cjs'],
      ['Export added', 'src/index.ts'],
    ]) + codeBlock(`${cls}.ts`, 'preview', escapeHTML(
      `export class ${cls} extends BaseConnector {\n  async authenticate() {\n    // BaseConnector handles auth\n  }\n\n  async testConnection() {\n    return this.get('/health')\n  }\n\n${methods}\n}`
    ))
  },
  typecheck(p) {
    return facts([
      ['Errors', '<span class="ok">0</span>', ''],
      ['Files checked', String(p.files.length)],
      ['Self-corrections', '0 retries'],
      ['Status', '<span class="ok">Clean</span>', ''],
    ]) + codeBlock('tsc --noEmit', 'typecheck', escapeHTML('$ npm run typecheck\n\nFound 0 errors. Compilation done.\n\n✓ All generated files compile cleanly.'))
  },
  tests(p) {
    return table(
      ['Test', 'Status', 'Details'],
      [
        ['testConnection', '<span class="ok">PASS</span>', 'Mock API returned 200'],
        [escapeHTML(p.ops[0]), '<span class="ok">PASS</span>', 'Response normalized correctly'],
        [escapeHTML(p.ops[1]), '<span class="ok">PASS</span>', 'Pagination handled'],
        [`${escapeHTML(p.ops.at(-1))} (live)`, '<span class="skip">SKIP</span>', 'Missing CI credential'],
      ]
    ) + codeBlock('playwright', 'e2e', escapeHTML(`npm run test:connectors -- --grep "${p.name}"`))
  },
  review() {
    return `<div class="score-row">
      <div class="score-ring"><strong>87</strong></div>
      <div class="score-body">
        <strong>Approved with Warnings</strong>
        <p>Follows BaseConnector contract. Auth stays in base class. No hardcoded secrets or unsafe dynamic calls.</p>
      </div>
    </div>` + table(
      ['Severity', 'File', 'Issue'],
      [
        ['<span class="warn">warning</span>', 'constants.ts', 'Document provider rate limit defaults'],
        ['<span class="warn">warning</span>', 'types.ts',     'Add JSDoc on pagination response shapes'],
      ]
    )
  },
  mr(p) {
    const prefix = p.mode === 'Update' ? 'update' : 'feat'
    const title  = `${prefix}(connector): ${p.mode.toLowerCase()} ${p.name}`
    const body   = `## ${p.mode === 'Update' ? 'Update' : 'New'} Connector: ${p.name}\n\n**Auth:** ${p.auth}\n**Operations:** ${p.ops.join(', ')}\n\n## Test Results\n✓ testConnection — passed\n✓ ${p.ops[0]} — passed\n✓ ${p.ops[1]} — passed\n⚠ ${p.ops.at(-1)} — skipped\n\n## Code Review\nScore: 87/100 | APPROVED WITH WARNINGS\n\n🤖 Auto-generated by complyment-connectors-sdk generator`
    return facts([
      ['Title', escapeHTML(title)],
      ['Branch → base', `${escapeHTML(p.branch)} → main`],
      ['Files changed', String(p.files.length)],
      ['Status', 'Draft — awaiting approval'],
    ]) + codeBlock('pull-request-body.md', 'preview', escapeHTML(body))
  },
  notify(p) {
    const preview = `Connector : ${p.name}\nMode      : ${p.mode}\nBranch    : ${p.branch}\nTests     : 3 passed, 1 skipped\nScore     : 87/100\nPR        : github.com/IMMANAPK/complyment-connectors-sdk/pull/…\n\nAction required: Please review and merge the connector PR.`
    return facts([
      ['To', 'connector-reviewers@skill-mine.com'],
      ['Channel', 'Email'],
      ['Subject', `[Connector Ready] ${escapeHTML(p.name)}`],
      ['Status', 'Ready to send'],
    ]) + codeBlock('notification-preview.txt', 'preview', escapeHTML(preview))
  },
}

// ── Render ────────────────────────────────────────────────────
function renderSidebar() {
  const done = Math.max(0, S.approved + 1)
  document.getElementById('run-id').textContent    = S.runId
  document.getElementById('prog-fill').style.width = `${Math.round((done / STEPS.length) * 100)}%`
  document.getElementById('prog-text').textContent  = `${done} / ${STEPS.length}`
  document.getElementById('kpi-mode').textContent  = S.started ? S.profile.mode : '—'
  document.getElementById('kpi-conf').textContent  = S.started ? S.profile.confidence : '—'
  document.getElementById('kpi-score').textContent = S.approved >= 6 ? '87' : '—'

  document.getElementById('step-nav').innerHTML = STEPS.map((st, i) => {
    const done    = i <= S.approved
    const active  = i === S.step && S.started
    const skipped = done && S.skippedSteps.has(st.id)
    const cls = `step-item${done ? (skipped ? ' skipped' : ' done') : ''}${active ? ' active' : ''}`
    const num  = done ? (skipped ? '–' : '✓') : i + 1
    const tag  = active ? 'live' : skipped ? 'skip' : done ? 'done' : 'wait'
    return `<button class="${cls}" data-step="${i}" type="button">
      <span class="s-num">${num}</span>
      <span class="s-info"><strong>${escapeHTML(st.title)}</strong><span>${escapeHTML(st.sub)}</span></span>
      <span class="s-tag">${tag}</span>
    </button>`
  }).join('')

  document.querySelectorAll('[data-step]').forEach(b =>
    b.addEventListener('click', () => { if (S.started) { S.step = +b.dataset.step; renderMain() } })
  )

  const files = S.started ? S.profile.files : []
  document.getElementById('files-section').style.display = files.length ? '' : 'none'
  document.getElementById('file-list').innerHTML = files.map((f, i) => `
    <div class="file-item">
      <span class="f-ext">${f.split('.').pop().slice(0,3).toUpperCase()}</span>
      <span class="f-name">${escapeHTML(f)}<em>${i < 5 ? 'connector source' : 'registry patch'}</em></span>
      <span class="f-status">${S.approved >= 3 ? 'ready' : 'plan'}</span>
    </div>`).join('')

}

function renderMain() {
  const st = STEPS[S.step]
  document.getElementById('step-eye').textContent = `Step ${S.step + 1} of ${STEPS.length}`
  document.getElementById('step-h2').textContent  = st.title
  document.getElementById('step-p').textContent   = st.sub

  const pill  = document.getElementById('step-pill')
  const isNext = S.step === S.approved + 1
  const isDone = S.step <= S.approved
  pill.textContent = isDone ? 'Done' : isNext ? 'Awaiting Approval' : 'Queued'
  pill.className   = `step-pill ${isDone ? 'done' : isNext ? 'await' : 'queue'}`

  const liveOutput = stepOutputFor(st.id)
  const builder = OUT[st.id]
  document.getElementById('out-card').innerHTML = liveOutput
    ? renderLiveOutput(st.id, liveOutput)
    : S.liveRun
      ? `<div class="out-placeholder">Waiting for live ${escapeHTML(S.sourceKind)} output from the generator backend.</div>`
      : builder
      ? builder(S.profile)
      : '<div class="out-placeholder">Step output will appear here.</div>'

  renderChat()
  highlightCode()
}

function renderChat() {
  const chat = document.getElementById('chat')
  chat.innerHTML = S.msgs.map(m => `
    <div class="msg${m.role === 'user' ? ' me' : ''}">
      <div class="who">${m.role === 'user' ? 'You' : 'Generator'}</div>
      <div>${escapeHTML(m.text)}</div>
    </div>`).join('')
  chat.scrollTop = chat.scrollHeight
}

function pushRawLog(event, payload = {}) {
  S.rawLogs.push({
    at: new Date().toLocaleTimeString('en-US', { hour12: false }),
    event,
    payload,
  })
  S.rawLogs = S.rawLogs.slice(-200)
  renderRawLog()
}

function renderRawLog() {
  const el = document.getElementById('raw-log')
  if (!el) return
  el.textContent = S.rawLogs.length
    ? S.rawLogs.map(entry => `[${entry.at}] ${entry.event}\n${JSON.stringify(entry.payload, null, 2)}`).join('\n\n')
    : 'Waiting for generator events.'
  el.scrollTop = el.scrollHeight
}

function renderMode() {
  document.getElementById('mode-interactive').classList.toggle('active',  S.interactive)
  document.getElementById('mode-auto').classList.toggle('active', !S.interactive)
  document.getElementById('hitl-badge').textContent = S.interactive ? 'Interactive' : 'Auto'
}

function showRecovery(reason = '') {
  const card = document.getElementById('recovery-card')
  document.getElementById('recovery-reason').textContent = reason || 'The document could not be validated as API documentation.'
  card.classList.remove('hidden')
}

function hideRecovery() {
  document.getElementById('recovery-card')?.classList.add('hidden')
}

function render() {
  renderSidebar()
  if (S.started) renderMain()
  renderRawLog()
  renderMode()
}

// ── Live backend integration ──────────────────────────────────
// Detects the generator API instead of relying on a fixed port, so the page is
// live whenever it is served by the generator server.
let liveBackendPromise = null

function hasLiveBackend() {
  if (!/^https?:$/.test(location.protocol)) return Promise.resolve(false)
  if (!liveBackendPromise) {
    liveBackendPromise = fetch('/api/info', { cache: 'no-store' })
      .then(res => res.ok)
      .catch(() => false)
  }
  return liveBackendPromise
}

function connectStream(runId) {
  const es = new EventSource(`/api/stream/${runId}`)
  es.onmessage = e => {
    const data = JSON.parse(e.data)
    handleServerEvent(data)
  }
  es.onerror = () => es.close()
  S.eventSource = es
}

function handleServerEvent(data) {
  const { event, step, stepIndex, output, error, message, reason } = data
  pushRawLog(event || 'message', data)

  if (event === 'log') {
    S.msgs.push({ role: 'ai', text: message || '' }); renderChat(); return
  }
  if (event === 'step:start') {
    S.step = stepIndex
    S.msgs.push({ role: 'ai', text: `Running: ${STEPS[stepIndex]?.title}…` })
    render(); mini?.updateStep(S.step, S.approved); return
  }
  if (event === 'step:done') {
    S.approved = Math.max(S.approved, stepIndex)
    if (output?.skipped) S.skippedSteps.add(step)
    else S.skippedSteps.delete(step)
    if (output && typeof output === 'object') {
      S.stepOutputs = S.stepOutputs || {}
      S.stepOutputs[step] = output
      if (step === 'validate') {
        S.profile = {
          ...S.profile,
          name: output.connectorName || S.profile.name,
          auth: output.authType || output.authDetails || S.profile.auth,
          baseUrl: output.baseUrl || S.profile.baseUrl,
          ops: output.operationsFound?.length ? output.operationsFound : S.profile.ops,
          confidence: output.confidence != null ? `${output.confidence}%` : S.profile.confidence,
          mode: S.profile.mode || 'Create',
        }
      }
      if (step === 'conflict') {
        S.profile = { ...S.profile, mode: output.mode === 'update' ? 'Update' : 'Create' }
      }
      if (step === 'codegen') {
        const files = output.writeResult?.files?.map(f => f.split('/').pop()) || Object.keys(output.files || {}).filter(f => f !== 'registry_patch')
        S.profile = { ...S.profile, files: files.length ? files : S.profile.files }
      }
    }
    const next = stepIndex + 1
    if (next < STEPS.length) {
      S.step = next
      S.msgs.push({ role: 'ai', text: MSG[STEPS[next].id]?.(S.profile) ?? `${STEPS[next].title} ready.` })
    }
    render(); mini?.updateStep(S.step, S.approved); return
  }
  if (event === 'hitl:prompt') {
    S.awaitingHITL = true
    S.msgs.push({ role: 'ai', text: `Awaiting your approval for: ${STEPS[S.step]?.title}` })
    render(); return
  }
  if (event === 'done') {
    S.msgs.push({ role: 'ai', text: 'Pipeline complete. PR and notification steps are ready.' })
    S.eventSource?.close(); render(); return
  }
  if (event === 'abort') {
    S.msgs.push({ role: 'ai', text: `Pipeline aborted: ${reason || error}` })
    showRecovery(reason || error)
    S.eventSource?.close(); render()
  }
}

// ── Actions ───────────────────────────────────────────────────
async function start(profileName, file = null, url = '') {
  const backendLive = await hasLiveBackend()
  const sourceKind = url ? 'url' : file ? 'file' : 'demo'

  if (!backendLive && sourceKind !== 'demo') {
    S.msgs = [{ role: 'ai', text: 'Live generator backend is not available. Start with npm run generate:ui and open /generator.html.' }]
    renderChat()
    return
  }

  S.liveRun = backendLive
  S.sourceKind = sourceKind
  S.stepOutputs = {}
  S.rawLogs = []
  hideRecovery()
  S.profile  = sourceKind === 'demo'
    ? PROFILES[profileName] || PROFILES['CrowdStrike Falcon']
    : {
        name: sourceKind === 'url' ? 'URL document' : 'Uploaded document',
        mode: '—',
        confidence: '—',
        branch: '—',
        auth: 'Analyzing',
        baseUrl: url || 'Uploaded file',
        ops: [],
        files: [],
      }
  S.step     = 0; S.approved = -1; S.started = true; S.awaitingHITL = false
  S.msgs = [{ role: 'ai', text: backendLive ? `Starting live ${sourceKind} analysis…` : MSG.validate(S.profile) }]
  pushRawLog('run:start', { sourceKind, url: url || null, file: file?.name || null, liveBackend: backendLive })
  document.getElementById('upload-screen').classList.add('hidden')
  document.getElementById('pipe-screen').classList.remove('hidden')
  render()
  mini?.updateStep(0, -1)

  // Show resume button only when backend is available
  const resumeRow = document.getElementById('resume-row')
  if (resumeRow && backendLive) resumeRow.style.display = ''

  if (backendLive) {
    const form = new FormData()
    if (file) {
      form.append('document', file)
    } else if (url) {
      form.append('url', url)
    } else {
      form.append('demo', profileName)
    }
    form.append('interactive', S.interactive ? 'true' : 'false')
    const runTests = document.getElementById('opt-run-tests')?.checked
    if (runTests) form.append('runTests', 'true')
    if (Object.keys(S.stepConfigOverrides).length) {
      form.append('stepConfig', JSON.stringify(S.stepConfigOverrides))
    }
    const resp = await fetch('/api/generate', { method: 'POST', body: form })
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}))
      pushRawLog('api:error', { status: resp.status, data })
      throw new Error(data.error || `Generator request failed: ${resp.status}`)
    }
    const { runId, provider } = await resp.json()
    pushRawLog('api:generate', { runId, provider })
    S.runId = runId
    document.getElementById('run-id').textContent = runId
    document.getElementById('ai-name').textContent = provider || 'AI'
    connectStream(runId)
  }
}

async function approve(instruction = '') {
  const st = STEPS[S.step]

  if (await hasLiveBackend() && S.runId) {
    if (instruction) S.msgs.push({ role: 'user', text: instruction })
    await fetch(`/api/hitl/${S.runId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: instruction ? 'INSTRUCT' : 'APPROVE', instruction }),
    })
    S.awaitingHITL = false
    renderChat()
    return
  }

  // Mock / demo mode
  if (instruction) {
    S.msgs.push({ role: 'user', text: instruction })
    S.msgs.push({ role: 'ai', text: `Instruction applied to ${st.title}. ${MSG[st.id]?.(S.profile) ?? ''}` })
  } else {
    S.msgs.push({ role: 'user', text: `Approved: ${st.title}` })
  }
  S.approved = Math.max(S.approved, S.step)
  if (S.step < STEPS.length - 1) {
    S.step++
    S.msgs.push({ role: 'ai', text: MSG[STEPS[S.step].id]?.(S.profile) ?? `${STEPS[S.step].title} ready for review.` })
  } else {
    S.msgs.push({ role: 'ai', text: 'Pipeline complete. PR created and notification sent. Connector is ready for review.' })
  }
  render(); mini?.updateStep(S.step, S.approved)
}

function reset() {
  S.step = 0; S.approved = -1; S.started = false; S.msgs = []; S.rawLogs = []; S.liveRun = false; S.sourceKind = 'demo'; S.stepOutputs = {}
  hideRecovery()
  document.getElementById('upload-screen').classList.remove('hidden')
  document.getElementById('pipe-screen').classList.add('hidden')
  render(); mini?.updateStep(0, -1)
}

// ── Bind ──────────────────────────────────────────────────────
document.getElementById('hitl-form').addEventListener('submit', e => {
  e.preventDefault()
  const inp = document.getElementById('instr-input')
  approve(inp.value.trim()); inp.value = ''
})
document.getElementById('btn-skip').addEventListener('click', async () => {
  S.msgs.push({ role: 'user', text: `Skipped: ${STEPS[S.step].title}` })
  if (await hasLiveBackend() && S.runId) {
    await fetch(`/api/hitl/${S.runId}`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'SKIP', instruction: '' }) })
    renderChat()
  } else { approve() }
})
document.getElementById('btn-retry').addEventListener('click', async () => {
  const st = STEPS[S.step]
  S.msgs.push({ role: 'user', text: `Retry: ${st.title}` })
  if (await hasLiveBackend() && S.runId) {
    await fetch(`/api/hitl/${S.runId}`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'RETRY', instruction: '' }) })
    renderChat()
  } else {
    S.msgs.push({ role: 'ai', text: `Re-ran ${st.title} — same result.` })
    render()
  }
})
document.getElementById('mode-interactive').addEventListener('click', () => {
  S.interactive = true
  S.msgs.push({ role: 'ai', text: 'Switched to interactive mode.' }); render()
})
document.getElementById('mode-auto').addEventListener('click', () => {
  S.interactive = false
  S.msgs.push({ role: 'ai', text: 'Switched to auto mode.' }); render()
})
document.getElementById('reset-btn').addEventListener('click', reset)

document.getElementById('settings-btn').addEventListener('click', () => {
  const panel = document.getElementById('settings-panel')
  panel.classList.toggle('hidden')
  if (!panel.classList.contains('hidden')) renderSettingsPanel()
})

document.getElementById('resume-close').addEventListener('click', () => {
  document.getElementById('resume-overlay').classList.add('hidden')
})
document.getElementById('resume-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden')
})
document.getElementById('resume-btn')?.addEventListener('click', openResumeDialog)
document.getElementById('raw-copy').addEventListener('click', async () => {
  const text = document.getElementById('raw-log').textContent || ''
  try { await navigator.clipboard.writeText(text) } catch { /* clipboard may be unavailable */ }
})
document.getElementById('btn-reupload').addEventListener('click', () => {
  reset()
  document.getElementById('doc-upload').click()
})
document.getElementById('btn-reshare').addEventListener('click', () => {
  reset()
  document.getElementById('doc-url').focus()
})

// ── Settings panel — per-step HITL toggles ────────────────────
function renderSettingsPanel() {
  // Low Power Mode toggle
  const lpEl = document.getElementById('sp-low-power')
  if (lpEl) {
    lpEl.checked = S.lowPower
    lpEl.onchange = () => {
      S.lowPower = lpEl.checked
      if (mini) S.lowPower ? mini.stop() : mini.start()
      const label = lpEl.closest('.toggle-wrap')?.querySelector('.toggle-label')
      if (label) label.textContent = S.lowPower ? 'On' : 'Off'
    }
  }

  const el = document.getElementById('sp-steps')
  if (!el) return
  el.innerHTML = STEPS.map(st => {
    const enabled = S.stepConfigOverrides[st.id]?.interactive !== false
    return `<div class="sp-row">
      <div class="sp-row-info">
        <strong>${escapeHTML(st.title)}</strong>
        <span>${escapeHTML(st.sub)}</span>
      </div>
      <label class="toggle-wrap">
        <input type="checkbox" class="sp-toggle" data-step="${st.id}" ${enabled ? 'checked' : ''} />
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
        <span class="toggle-label">${enabled ? 'Interactive' : 'Auto'}</span>
      </label>
    </div>`
  }).join('')

  el.querySelectorAll('.sp-toggle').forEach(cb => {
    cb.addEventListener('change', () => {
      const stepId = cb.dataset.step
      S.stepConfigOverrides[stepId] = { interactive: cb.checked }
      const label = cb.closest('.toggle-wrap')?.querySelector('.toggle-label')
      if (label) label.textContent = cb.checked ? 'Interactive' : 'Auto'
    })
  })
}

// ── Resume dialog ─────────────────────────────────────────────
async function openResumeDialog() {
  const overlay = document.getElementById('resume-overlay')
  const list    = document.getElementById('resume-list')
  overlay.classList.remove('hidden')
  list.innerHTML = '<div class="resume-loading">Loading saved runs…</div>'

  try {
    const resp = await fetch('/api/runs')
    const runs = resp.ok ? await resp.json() : []
    if (!runs.length) {
      list.innerHTML = '<div class="resume-loading">No saved runs found.</div>'
      return
    }
    list.innerHTML = runs.map(r => `
      <button class="resume-item" data-id="${escapeHTML(r.connectorId)}">
        <div class="ri-name">${escapeHTML(r.connectorName || r.connectorId)}</div>
        <div class="ri-meta">
          <span>Step ${r.lastCompletedStep + 1} of ${STEPS.length} completed</span>
          <span>${new Date(r.updatedAt).toLocaleString()}</span>
        </div>
      </button>`).join('')

    list.querySelectorAll('.resume-item').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.classList.add('hidden')
        startResume(btn.dataset.id)
      })
    })
  } catch (err) {
    list.innerHTML = `<div class="resume-loading">Error: ${escapeHTML(err.message)}</div>`
  }
}

async function startResume(connectorId) {
  const backendLive = await hasLiveBackend()
  if (!backendLive) {
    S.msgs = [{ role: 'ai', text: 'Resume requires the live generator backend. Run npm run generate:ui first.' }]
    renderChat(); return
  }
  S.liveRun = true; S.sourceKind = 'resume'; S.stepOutputs = {}; S.rawLogs = []
  hideRecovery()
  S.profile = { name: connectorId, mode: '—', confidence: '—', branch: '—', auth: '—', baseUrl: '—', ops: [], files: [] }
  S.step = 0; S.approved = -1; S.started = true; S.awaitingHITL = false
  S.msgs = [{ role: 'ai', text: `Resuming pipeline for connector: ${connectorId}…` }]
  document.getElementById('upload-screen').classList.add('hidden')
  document.getElementById('pipe-screen').classList.remove('hidden')
  render(); mini?.updateStep(0, -1)

  const form = new FormData()
  form.append('resume', connectorId)
  form.append('interactive', S.interactive ? 'true' : 'false')
  if (Object.keys(S.stepConfigOverrides).length) {
    form.append('stepConfig', JSON.stringify(S.stepConfigOverrides))
  }
  const resp = await fetch('/api/generate', { method: 'POST', body: form })
  if (!resp.ok) { const d = await resp.json().catch(() => ({})); throw new Error(d.error || `Resume failed: ${resp.status}`) }
  const { runId, provider } = await resp.json()
  S.runId = runId
  document.getElementById('run-id').textContent = runId
  document.getElementById('ai-name').textContent = provider || 'AI'
  connectStream(runId)
}

// ── Theme toggle ──────────────────────────────────────────────
const THEME_KEY = 'cg-theme'
let currentTheme = localStorage.getItem(THEME_KEY) || 'dark'

function applyTheme(t) {
  currentTheme = t
  document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : '')
  localStorage.setItem(THEME_KEY, t)
  document.getElementById('theme-icon-moon').style.display = t === 'dark'  ? '' : 'none'
  document.getElementById('theme-icon-sun').style.display  = t === 'light' ? '' : 'none'
  // Switch highlight.js theme to match
  const hljsLink = document.getElementById('hljs-theme')
  if (hljsLink) {
    const base = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/'
    hljsLink.href = t === 'light' ? `${base}github.min.css` : `${base}github-dark.min.css`
  }
  mini?.updateTheme(t === 'light')
}

document.getElementById('theme-btn').addEventListener('click', () => {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark')
})

applyTheme(currentTheme)

document.querySelectorAll('[data-demo]').forEach(b =>
  b.addEventListener('click', () => start(b.dataset.demo))
)

const upload = document.getElementById('doc-upload')
upload.addEventListener('change', () => {
  if (upload.files?.[0]) start('CrowdStrike Falcon', upload.files[0])
})

document.getElementById('url-form').addEventListener('submit', e => {
  e.preventDefault()
  const value = document.getElementById('doc-url').value.trim()
  if (value) start('CrowdStrike Falcon', null, value)
})

const dz = document.getElementById('dropzone')
;['dragenter','dragover'].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.add('over') }))
;['dragleave','drop'].forEach(t => dz.addEventListener(t, e => {
  e.preventDefault(); dz.classList.remove('over')
  const file = e.dataTransfer?.files?.[0]
  if (t === 'drop' && file) start('CrowdStrike Falcon', file)
}))

// ── Init ──────────────────────────────────────────────────────
render()
try { mini = initBgScene() } catch (e) { console.warn('3D bg scene skipped:', e) }
