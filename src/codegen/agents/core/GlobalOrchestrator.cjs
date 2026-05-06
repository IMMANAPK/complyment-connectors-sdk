'use strict'
const { getMemory, releaseMemory }   = require('../infrastructure/AgentMemory.cjs')
const { getBus, releaseBus }         = require('../infrastructure/MessageBus.cjs')
const { getLogger, releaseLogger }   = require('../infrastructure/TraceLogger.cjs')
const { globalRegistry, loadAllTools } = require('../infrastructure/ToolRegistry.cjs')
const { stageSuccess, stageFailed, stageSkipped } = require('../types/StageResult.cjs')

/**
 * GlobalOrchestrator — Gap #1 coexistence strategy.
 *
 * config.useMultiAgent = false → delegates entirely to legacy orchestrator.cjs
 * config.useMultiAgent = true  → migrated stages use new supervisor/agent system
 *                                unmigrated stages delegate to legacy orchestrator
 *
 * Cross-stage feedback (Gap #7):
 *   - AgentMemory.pushFeedback(fromStage, toStage, feedback)
 *   - Before each stage: pulls feedback from memory
 *   - If feedback requires rework: re-runs the affected upstream stage
 */
class GlobalOrchestrator {
  constructor(config, rootDir = process.cwd()) {
    this.config  = config
    this.rootDir = rootDir
    this._migratedStages = new Set(['validate', 'branch', 'conflict', 'codegen', 'typecheck', 'tests', 'review', 'pr', 'notify'])
  }

  async run(opts = {}) {
    const config = this.config

    // ── LEGACY MODE ──────────────────────────────────────────────────────────
    if (!config.useMultiAgent) {
      const { run } = require('../../pipeline/orchestrator.cjs')
      return run(opts)
    }

    // ── MULTI-AGENT MODE ─────────────────────────────────────────────────────
    const runId  = opts.runId || 'MA-' + Math.random().toString(36).slice(2, 7).toUpperCase()
    const memory = getMemory(runId)
    const bus    = getBus(runId)
    const logger = getLogger(runId, this.rootDir)

    loadAllTools(this.rootDir)

    const infrastructure = {
      memory, bus, logger,
      toolRegistry: globalRegistry,
      config:       { ...config, _webMode: opts._webMode || false },
    }

    bus.publish('pipeline:start', { runId, mode: 'multi-agent' })
    opts.onEvent?.('pipeline:start', { runId })

    const stageResults = {}
    let pipelineStatus = 'success'

    try {
      // ── STAGE 1: Document Validation ────────────────────────────────────────
      stageResults.validate = await this._runStage('validate', async () => {
        const { DocumentValidationSupervisor } = require('../stages/validate/DocumentValidationSupervisor.cjs')
        const sup = new DocumentValidationSupervisor(infrastructure)
        return sup.run({ docText: opts.docText, docPath: opts.docPath, docUrl: opts.docUrl }, runId)
      }, opts, bus)

      if (stageResults.validate.status !== 'success') {
        throw new Error(`Document validation failed: ${JSON.stringify(stageResults.validate.output)}`)
      }

      const analysis   = stageResults.validate.output.analysis
      const docText    = stageResults.validate.output.docText || opts.docText || ''
      const connectorId = analysis.connectorId || _toId(analysis.connectorName)
      memory.write('analysis',    analysis,    { stageId: 'validate', agentId: 'supervisor' })
      memory.write('connectorId', connectorId, { stageId: 'validate', agentId: 'supervisor' })

      // ── STAGE 2: Branch Management ──────────────────────────────────────────
      stageResults.branch = await this._runStage('branch', async () => {
        const { BranchSupervisor } = require('../stages/branch/BranchSupervisor.cjs')
        const sup = new BranchSupervisor(infrastructure)
        return sup.run({
          connectorId,
          dryRun:   config.dryRun   !== false,
          applyGit: config.applyGit || false,
        }, runId)
      }, opts, bus)

      // ── STAGE 3: Conflict / Mode Analysis ──────────────────────────────────
      stageResults.conflict = await this._runStage('conflict', async () => {
        const { AnalysisSupervisor } = require('../stages/analysis/AnalysisSupervisor.cjs')
        const sup = new AnalysisSupervisor(infrastructure)
        return sup.run({
          connectorId,
          analysis,
          branchResult: stageResults.branch.output,
        }, runId)
      }, opts, bus)

      const branchResult = stageResults.branch.output
      const modeInfo     = stageResults.conflict.output

      // ── STAGE 4: Code Generation ────────────────────────────────────────────
      stageResults.codegen = await this._runStage('codegen', async () => {
        const { CodegenSupervisor } = require('../stages/codegen/CodegenSupervisor.cjs')
        const sup = new CodegenSupervisor(infrastructure)
        return sup.run({ analysis, docText, mode: modeInfo.mode }, runId)
      }, opts, bus)

      if (stageResults.codegen.status !== 'success') {
        throw new Error('Code generation failed')
      }

      const genResult = stageResults.codegen.output.genResult
      memory.write('genResult', genResult, { stageId: 'codegen', agentId: 'supervisor' })

      // ── STAGE 5: TypeCheck ──────────────────────────────────────────────────
      stageResults.typecheck = await this._runStage('typecheck', async () => {
        if (!config.runTypecheck) return stageSkipped('typecheck')
        const { TypecheckSupervisor } = require('../stages/typecheck/TypecheckSupervisor.cjs')
        const sup = new TypecheckSupervisor(infrastructure)
        return sup.run({ genResult }, runId)
      }, opts, bus)

      let activeGenResult = stageResults.typecheck.output?.fixedGenResult || genResult

      // ── STAGE 6: Playwright Tests ───────────────────────────────────────────
      stageResults.tests = await this._runStage('tests', async () => {
        if (!config.runTests) return stageSkipped('tests')
        const { TestSupervisor } = require('../stages/tests/TestSupervisor.cjs')
        const sup = new TestSupervisor(infrastructure)
        return sup.run({ connectorId, genResult: activeGenResult }, runId)
      }, opts, bus)

      // ── STAGE 7: Code Review ────────────────────────────────────────────────
      stageResults.review = await this._runStage('review', async () => {
        const { ReviewSupervisor } = require('../stages/review/ReviewSupervisor.cjs')
        const sup = new ReviewSupervisor(infrastructure)
        return sup.run({ connectorId, genResult: activeGenResult }, runId)
      }, opts, bus)

      const reviewOutput = stageResults.review.output || {}

      // ── STAGE 8: Pull Request ───────────────────────────────────────────────
      stageResults.pr = await this._runStage('pr', async () => {
        const { PullRequestSupervisor } = require('../stages/pr/PullRequestSupervisor.cjs')
        const sup = new PullRequestSupervisor(infrastructure)
        return sup.run({
          connectorId,
          connectorName: analysis.connectorName,
          branch:        branchResult.branch,
          reviewResult:  reviewOutput,
          analysis,
          dryRun:        config.dryRun   !== false,
          applyGit:      config.applyGit || false,
          createPr:      config.createPr || false,
        }, runId)
      }, opts, bus)

      // ── STAGE 9: Notification ───────────────────────────────────────────────
      stageResults.notify = await this._runStage('notify', async () => {
        const { NotificationSupervisor } = require('../stages/notify/NotificationSupervisor.cjs')
        const sup = new NotificationSupervisor(infrastructure)
        return sup.run({
          connectorName:     analysis.connectorName,
          prUrl:             stageResults.pr.output?.prUrl,
          verdict:           reviewOutput.verdict,
          score:             reviewOutput.score,
          dryRun:            config.dryRun !== false,
          sendNotifications: config.sendNotifications || false,
        }, runId)
      }, opts, bus)

    } catch (err) {
      pipelineStatus = 'failed'
      bus.publish('pipeline:abort', { runId, reason: err.message })
      opts.onEvent?.('abort', { runId, reason: err.message })
      throw err
    } finally {
      bus.publish('pipeline:done', { runId, status: pipelineStatus, stageResults })
      opts.onEvent?.('done', { runId, status: pipelineStatus })
      releaseBus(runId)
      releaseMemory(runId)
      releaseLogger(runId)
    }

    return { runId, status: pipelineStatus, stageResults }
  }

  async _runStage(stageId, fn, opts, bus) {
    bus.publish(`stage:${stageId}:start`, { stageId })
    opts.onEvent?.(`step:start`, { step: stageId })
    try {
      const result = await fn()
      bus.publish(`stage:${stageId}:done`, { stageId, status: result.status })
      opts.onEvent?.(`step:done`, { step: stageId, output: result.output })
      return result
    } catch (err) {
      bus.publish(`stage:${stageId}:error`, { stageId, error: err.message })
      opts.onEvent?.(`step:error`, { step: stageId, error: err.message })
      return stageFailed(stageId, { error: err.message })
    }
  }

  /**
   * Delegate an unmigrated stage to the legacy per-step logic.
   * Wraps the legacy function call in a StageResult envelope.
   */
  async _delegateToLegacy(stageId, opts, analysis, runId, bus, extra = {}) {
    bus.publish(`stage:${stageId}:start`, { stageId, delegated: true })
    opts.onEvent?.('step:start', { step: stageId })
    const t0 = Date.now()
    try {
      let output = {}
      // Call the relevant existing module directly
      if (stageId === 'branch') {
        const { manageBranch } = require('../../git/branch-manager.cjs')
        output = await manageBranch(analysis.connectorId || _toId(analysis.connectorName), this.rootDir, {
          dryRun: this.config.dryRun, applyGit: this.config.applyGit,
        })
      } else if (stageId === 'conflict') {
        const { readExistingConnector, getChangelog } = require('../../differ.cjs')
        const existingFiles = readExistingConnector(this.rootDir, analysis.connectorId || _toId(analysis.connectorName))
        const mode = opts.mode || (Object.keys(existingFiles).length ? 'update' : 'create')
        output = { mode, existingFiles, changelog: getChangelog(analysis, existingFiles) }
      } else if (stageId === 'tests') {
        const { runTestsWithFix } = require('../../test-runner.cjs')
        const connId = analysis.connectorId || _toId(analysis.connectorName)
        output = await runTestsWithFix(connId, extra.activeGenResult, this.rootDir, this.config.maxTestRetries)
      } else if (stageId === 'review') {
        const { reviewCode } = require('../../code-reviewer.cjs')
        output = await reviewCode(extra.activeGenResult)
      } else if (stageId === 'pr') {
        const { commitFiles, pushBranch } = require('../../git/branch-manager.cjs')
        const { createPR } = require('../../git/pr-creator.cjs')
        const branch = extra.branchResult?.branch
        await commitFiles(branch, analysis.connectorName, this.rootDir, { dryRun: this.config.dryRun, applyGit: this.config.applyGit })
        await pushBranch(branch, this.rootDir, { dryRun: this.config.dryRun, applyGit: this.config.applyGit }).catch(() => {})
        output = await createPR({ branch, connectorName: analysis.connectorName, mode: 'create', analysis, reviewResult: extra.reviewResult, cwd: this.rootDir, dryRun: this.config.dryRun, createPr: this.config.createPr })
      } else if (stageId === 'notify') {
        const { notify } = require('../../notifier.cjs')
        output = await notify({ connectorName: analysis.connectorName, prUrl: extra.prUrl, dryRun: this.config.dryRun, sendNotifications: this.config.sendNotifications })
      }

      opts.onEvent?.('step:done', { step: stageId, output })
      return stageSuccess(stageId, output, { duration: Date.now() - t0 })
    } catch (err) {
      opts.onEvent?.('step:error', { step: stageId, error: err.message })
      return stageFailed(stageId, { error: err.message }, { duration: Date.now() - t0 })
    }
  }
}

function _toId(name) {
  return String(name || 'generated').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

module.exports = { GlobalOrchestrator }
