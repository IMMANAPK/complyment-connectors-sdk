'use strict'

function createStageResult({ stageId, status, duration = 0, tokensUsed = 0, agentsSpawned = [], output = {}, feedback = {} }) {
  return { stageId, status, duration, tokensUsed, agentsSpawned, output, feedback }
}

function stageSuccess(stageId, output, { duration = 0, tokensUsed = 0, agentsSpawned = [], feedback = {} } = {}) {
  return createStageResult({ stageId, status: 'success', duration, tokensUsed, agentsSpawned, output, feedback })
}

function stageFailed(stageId, output, { duration = 0, tokensUsed = 0, agentsSpawned = [], feedback = {} } = {}) {
  return createStageResult({ stageId, status: 'failed', duration, tokensUsed, agentsSpawned, output, feedback })
}

function stageSkipped(stageId) {
  return createStageResult({ stageId, status: 'skipped', output: { skipped: true } })
}

module.exports = { createStageResult, stageSuccess, stageFailed, stageSkipped }
