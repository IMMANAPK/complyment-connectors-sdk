'use strict'

const DEFAULT_CONFIG = Object.freeze({
  mode: 'interactive',
  dryRun: true,
  applyGit: false,
  createPr: false,
  sendNotifications: false,
  runTypecheck: true,
  runTests: false,
  maxTypecheckRetries: 2,
  maxTestRetries: 3,
  hitl: {
    validate: { enabled: true, timeout: 60, allowInstructions: true },
    branch: { enabled: true, timeout: 60, allowInstructions: true },
    conflict: { enabled: true, timeout: 120, allowInstructions: true },
    codegen: { enabled: true, timeout: 300, allowInstructions: true },
    typecheck: { enabled: true, timeout: 120, allowInstructions: false },
    tests: { enabled: true, timeout: 120, allowInstructions: false },
    review: { enabled: true, timeout: 120, allowInstructions: false },
    pr: { enabled: true, timeout: 60, allowInstructions: true },
    notify: { enabled: true, timeout: 60, allowInstructions: true },
  },
  autoApprove: {
    onLowRisk: true,
    confidenceThreshold: 90,
    escalateOn: ['breakingChanges', 'conflictsDetected', 'testsFailed'],
  },
  onTimeout: 'auto-approve',
})

module.exports = { DEFAULT_CONFIG }
