'use strict'
const { bus, EVENTS } = require('./event-bus.cjs')
const { saveState, loadState } = require('./state.cjs')
const { extractSource, extractText, extractUrl } = require('../extractors/index.cjs')
const { analyzeDocument } = require('../analyzer.cjs')
const { manageBranch, commitFiles, pushBranch } = require('../git/branch-manager.cjs')
const { generateConnector, writeFiles } = require('../code-generator.cjs')
const { typecheckWithFix } = require('../type-checker.cjs')
const { runTestsWithFix } = require('../test-runner.cjs')
const { reviewCode } = require('../code-reviewer.cjs')
const { createPR } = require('../git/pr-creator.cjs')
const { notify } = require('../notifier.cjs')
const { gate } = require('../hitl/ConversationGate.cjs')
const { getProviderName } = require('../providers/factory.cjs')
const { loadConfig, stepConfigFrom } = require('../config/config-loader.cjs')
const { readExistingConnector, getChangelog } = require('../differ.cjs')
const { formatChangelog } = require('../changelog-display.cjs')

const STEPS = [
  { id: 'validate', label: 'Document Validation' },
  { id: 'branch', label: 'Branch Management' },
  { id: 'conflict', label: 'Conflict / Mode Analysis' },
  { id: 'codegen', label: 'Code Generation' },
  { id: 'typecheck', label: 'Type Check' },
  { id: 'tests', label: 'Playwright Tests' },
  { id: 'review', label: 'Code Review' },
  { id: 'pr', label: 'Pull Request' },
  { id: 'notify', label: 'Notification' },
]

async function run(opts = {}) {
  const rootDir = opts.rootDir || process.cwd()
  const config = opts.config || loadConfig(rootDir, {
    mode: opts.autoApprove ? 'auto' : opts.interactive === false ? 'auto' : undefined,
    dryRun: opts.dryRun,
    apply: opts.applyGit,
    'create-pr': opts.createPr,
    notify: opts.sendNotifications,
    'run-tests': opts.runTests,
  })
  const stepConfig = { ...stepConfigFrom(config), ...(opts.stepConfig || {}) }
  const runId = opts.runId || 'RUN-' + Math.random().toString(36).slice(2, 7).toUpperCase()
  const emit = (event, data = {}) => {
    const payload = { runId, ...data }
    bus.emit(event, payload)
    opts.onEvent?.(event, payload)
  }
  const log = message => emit(EVENTS.LOG, { message })

  const state = opts.resume
    ? loadState(rootDir, opts.resume)
    : {
        runId,
        connectorId: null,
        branch: null,
        lastCompletedStep: -1,
        humanInstructions: [],
        steps: {},
        pr: null,
        notifications: [],
      }

  log(`Pipeline started [${runId}] provider=${getProviderName()} mode=${config.mode} dryRun=${config.dryRun}`)

  try {
    const docText = opts.docText
      || (opts.docUrl ? await extractUrl(opts.docUrl) : null)
      || (opts.docPath ? await extractText(opts.docPath) : state.docText)
    if (!docText) throw new Error('No document provided. Use --file, --url, --text, upload a file, or --resume an existing state.')
    state.docText = docText

    const analysis = await step(0, 'validate', async () => {
      log('Analyzing uploaded API document…')
      const result = await analyzeDocument(docText, instructionsFor(state, 'validate'))
      if (result.verdict === 'FAIL' || result.verdict === 'REJECT') {
        throw new Error(`Document rejected: ${result.reason}`)
      }
      state.connectorId = toId(result.connectorName)
      return result
    }, result => `${result.connectorName} — ${result.verdict} (${result.confidence}%)`, state, rootDir, config, stepConfig, opts, emit)

    const branchResult = await step(1, 'branch', async () => {
      log(`Checking branch for ${analysis.connectorName}…`)
      return manageBranch(state.connectorId, rootDir, { dryRun: config.dryRun, applyGit: config.applyGit })
    }, result => `Branch ${result.branch} — ${result.action}`, state, rootDir, config, stepConfig, opts, emit)
    state.branch = branchResult.branch

    const modeInfo = await step(2, 'conflict', async () => {
      const existingFiles = readExistingConnector(rootDir, state.connectorId)
      const mode = opts.mode || (Object.keys(existingFiles).length || branchResult.exists ? 'update' : 'create')
      const changelog = getChangelog(analysis, existingFiles)
      return {
        mode,
        connectorId: state.connectorId,
        hadConflicts: branchResult.hadConflicts,
        existingFiles,
        changelog,
      }
    }, result => `${result.mode.toUpperCase()} mode. ${formatChangelog(result.changelog)}`, state, rootDir, config, stepConfig, opts, emit)

    const genResult = await step(3, 'codegen', async () => {
      log('Generating connector files…')
      const generated = await generateConnector(analysis, docText, modeInfo.mode, instructionsFor(state, 'codegen'))
      const writeResult = writeFiles(generated, rootDir, { dryRun: config.dryRun })
      return { ...generated, writeResult, dryRun: config.dryRun }
    }, result => `${config.dryRun ? 'Previewed' : 'Wrote'} ${result.writeResult.files.length} files for ${result.className}`, state, rootDir, config, stepConfig, opts, emit)

    const typeResult = await step(4, 'typecheck', async () => {
      if (!config.runTypecheck) return { passed: true, skipped: true, summary: 'Disabled by config' }
      log('Running typecheck/self-correction loop…')
      return typecheckWithFix(genResult, rootDir, config.maxTypecheckRetries)
    }, result => result.summary || `${result.passed ? 'Passed' : 'Failed'} after ${result.attempts} attempt(s)`, state, rootDir, config, stepConfig, opts, emit)

    const testResult = await step(5, 'tests', async () => {
      if (!config.runTests) return { passed: true, skipped: true, summary: 'Disabled by config' }
      log('Running Playwright connector tests…')
      return runTestsWithFix(state.connectorId, genResult, rootDir, config.maxTestRetries)
    }, result => result.summary || `${result.passed ? 'Passed' : 'Failed'} after ${result.attempts} attempt(s)`, state, rootDir, config, stepConfig, opts, emit)

    const reviewResult = await step(6, 'review', async () => {
      log('Reviewing generated code…')
      return reviewCode(genResult, instructionsFor(state, 'review'))
    }, result => `Score: ${result.score}/100 — ${result.verdict}`, state, rootDir, config, stepConfig, opts, emit)

    const prResult = await step(7, 'pr', async () => {
      log('Preparing commit and pull request…')
      await commitFiles(branchResult.branch, analysis.connectorName, rootDir, { dryRun: config.dryRun, applyGit: config.applyGit })
      await pushBranch(branchResult.branch, rootDir, { dryRun: config.dryRun, applyGit: config.applyGit }).catch(err => ({ error: err.message }))
      return createPR({
        branch: branchResult.branch,
        connectorName: analysis.connectorName,
        mode: modeInfo.mode,
        analysis,
        reviewResult,
        testResult,
        cwd: rootDir,
        dryRun: config.dryRun,
        createPr: config.createPr,
      })
    }, result => result.url || `Draft ready: ${result.title}`, state, rootDir, config, stepConfig, opts, emit)
    state.pr = prResult

    const notifyResult = await step(8, 'notify', async () => {
      log('Preparing notifications…')
      return notify({
        connectorName: analysis.connectorName,
        branch: branchResult.branch,
        prUrl: prResult.url,
        reviewResult,
        testResult,
        dryRun: config.dryRun,
        sendNotifications: config.sendNotifications,
      })
    }, result => `Channels: ${result.map(r => r.channel).join(', ')}`, state, rootDir, config, stepConfig, opts, emit)
    state.notifications = notifyResult

    emit(EVENTS.DONE, { output: state })
    log(`Pipeline complete [${runId}]`)
    return state
  } catch (err) {
    emit(EVENTS.ABORT, { reason: err.message })
    throw err
  }
}

async function step(index, id, fn, summarize, state, rootDir, config, stepConfig, opts, emit) {
  emit(EVENTS.STEP_START, { step: id, stepIndex: index, total: STEPS.length })
  const output = await fn()
  state.steps[id] = output
  state.lastCompletedStep = index
  saveState(rootDir, state)
  emit(EVENTS.STEP_DONE, { step: id, stepIndex: index, output })

  const gateResult = await humanGate(id, STEPS[index].label, summarize(output), output, state, config, stepConfig, opts, emit)
  if (gateResult.intent === 'ABORT') throw new Error(`User aborted at ${id}`)
  if (gateResult.instruction) {
    // scope='all' means the instruction carries forward to all future steps
    const targetStep = gateResult.scope === 'all' ? 'all' : id
    state.humanInstructions.push({ step: targetStep, instruction: gateResult.instruction, at: new Date().toISOString() })
    saveState(rootDir, state)
  }
  if (gateResult.intent === 'RETRY' || gateResult.intent === 'INSTRUCT') {
    emit(EVENTS.STEP_START, { step: id, stepIndex: index, total: STEPS.length, retry: true })
    const retryOutput = await fn()
    state.steps[id] = retryOutput
    saveState(rootDir, state)
    emit(EVENTS.STEP_DONE, { step: id, stepIndex: index, output: retryOutput, retry: true })
    return retryOutput
  }
  if (gateResult.intent === 'SKIP') emit(EVENTS.STEP_SKIP, { step: id, stepIndex: index })
  return output
}

async function humanGate(id, label, summary, output, state, config, stepConfig, opts, emit) {
  const cfg = stepConfig[id] || {}
  const interactive = config.mode !== 'auto' && cfg.interactive !== false
  if (!interactive || opts.autoApprove) return { intent: 'APPROVE', instruction: '', scope: id }

  // Confidence-based auto-approve: skip HITL prompt when risk is low
  if (qualifiesForAutoApprove(id, output, config)) {
    emit(EVENTS.LOG, { message: `[Auto-approved] ${label} — low risk (confidence threshold met)` })
    return { intent: 'APPROVE', instruction: '', scope: id }
  }

  if (opts.waitForHuman) {
    emit(EVENTS.HITL_PROMPT, { step: id, message: summary })
    return opts.waitForHuman({ runId: state.runId, step: id, label, summary, config: cfg })
  }
  return gate(label, summary, { interactive: true, stepConfig: cfg, onTimeout: config.onTimeout })
}

function qualifiesForAutoApprove(id, output, config) {
  const aa = config.autoApprove
  if (!aa?.onLowRisk || !output) return false

  const escalateOn = aa.escalateOn || []
  const threshold = aa.confidenceThreshold || 90

  if (id === 'validate') {
    if ((output.confidence || 0) < threshold) return false
    if (output.verdict === 'WARN' || output.verdict === 'FAIL') return false
  }
  if (id === 'conflict') {
    if (output.hadConflicts && escalateOn.includes('conflictsDetected')) return false
    const hasBreaking = (output.changelog?.changes || []).some(c => c.severity === 'breaking')
    if (hasBreaking && escalateOn.includes('breakingChanges')) return false
  }
  if (id === 'tests' && !output.passed && escalateOn.includes('testsFailed')) return false
  if (id === 'typecheck' && !output.passed) return false

  return true
}

function instructionsFor(state, step) {
  return (state.humanInstructions || [])
    .filter(item => item.step === step || item.step === 'all')
    .map(item => item.instruction)
    .join('\n')
}

function toId(name) {
  return String(name || 'generated-api').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

module.exports = { run, bus, EVENTS, STEPS }
