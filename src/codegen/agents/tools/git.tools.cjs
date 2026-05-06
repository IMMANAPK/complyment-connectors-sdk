'use strict'
const { manageBranch, commitFiles, pushBranch } = require('../../git/branch-manager.cjs')
const { createPR } = require('../../git/pr-creator.cjs')

function registerGitTools(registry, rootDir = process.cwd()) {
  registry.register('git', 'branch', async ({ connectorId, dryRun = true, applyGit = false }) => {
    return manageBranch(connectorId, rootDir, { dryRun, applyGit })
  }, {
    description: 'Create or check out a git branch for a connector',
    params: [
      { name: 'connectorId', type: 'string' },
      { name: 'dryRun',      type: 'boolean' },
      { name: 'applyGit',    type: 'boolean' },
    ],
  })

  registry.register('git', 'commit', async ({ branch, connectorName, dryRun = true, applyGit = false }) => {
    return commitFiles(branch, connectorName, rootDir, { dryRun, applyGit })
  }, {
    description: 'Stage and commit generated connector files',
    params: [
      { name: 'branch',        type: 'string' },
      { name: 'connectorName', type: 'string' },
      { name: 'dryRun',        type: 'boolean' },
      { name: 'applyGit',      type: 'boolean' },
    ],
  })

  registry.register('git', 'push', async ({ branch, dryRun = true, applyGit = false }) => {
    return pushBranch(branch, rootDir, { dryRun, applyGit }).catch(err => ({ error: err.message }))
  }, {
    description: 'Push a branch to remote origin',
    params: [
      { name: 'branch',   type: 'string' },
      { name: 'dryRun',   type: 'boolean' },
      { name: 'applyGit', type: 'boolean' },
    ],
  })

  registry.register('git', 'createPR', async (opts) => {
    return createPR({ ...opts, cwd: rootDir })
  }, {
    description: 'Create a GitHub pull request via gh CLI or Octokit',
    params: [
      { name: 'branch',        type: 'string' },
      { name: 'connectorName', type: 'string' },
      { name: 'mode',          type: 'string' },
      { name: 'dryRun',        type: 'boolean' },
      { name: 'createPr',      type: 'boolean' },
    ],
  })
}

module.exports = { registerGitTools }
