'use strict'
const readline = require('readline')
const { getProvider } = require('../providers/factory.cjs')

const INTENT_SYSTEM = `You classify user instructions at a pipeline gate.
Respond with ONLY one of: APPROVE, SKIP, RETRY, ABORT, INSTRUCT
- APPROVE: user accepts the step output
- SKIP: user wants to skip this step
- RETRY: user wants to re-run this step
- ABORT: user wants to stop the entire pipeline
- INSTRUCT: user is giving a specific instruction to modify behavior`

const SCOPE_SYSTEM = `You determine if a user instruction is step-local or global (should carry forward to future pipeline steps).
Respond with ONLY: local OR global
Examples of GLOBAL: "always use camelCase", "make all PR titles have [CONNECTOR] prefix", "use consistent naming throughout", "never hardcode credentials"
Examples of LOCAL: "add a getUsers method here", "fix the error handling in this step", "change the base URL to x"`

async function gate(stepName, summary, config = {}) {
  const {
    interactive = true,
    autoApprove = false,
    stepConfig = {},
    onTimeout = 'auto-approve',
  } = config

  const stepInteractive = stepConfig.interactive ?? interactive
  if (!stepInteractive || autoApprove) return { intent: 'APPROVE', instruction: '', scope: stepName }

  const timeoutSecs = Number(stepConfig.timeout || 0)

  return new Promise(resolve => {
    let timer = null

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

    function finish(result) {
      if (timer) { clearTimeout(timer); timer = null }
      try { rl.close() } catch { /* already closed */ }
      resolve(result)
    }

    // Start countdown timer if timeout is configured
    if (timeoutSecs > 0 && onTimeout !== 'wait') {
      timer = setTimeout(() => {
        const intent = onTimeout === 'auto-approve' ? 'APPROVE' : 'ABORT'
        process.stdout.write(`\n⏱  [HITL TIMEOUT] ${stepName} — ${intent === 'APPROVE' ? 'auto-approved' : 'auto-rejected'} after ${timeoutSecs}s\n`)
        finish({ intent, instruction: '', scope: stepName })
      }, timeoutSecs * 1000)
    }

    const countdown = timeoutSecs > 0 && onTimeout !== 'wait'
      ? `  (auto-${onTimeout === 'auto-approve' ? 'approves' : 'rejects'} in ${timeoutSecs}s)`
      : ''

    console.log(`\n${'─'.repeat(60)}`)
    console.log(`[HITL] ${stepName}${countdown}`)
    console.log(`Summary: ${summary}`)
    console.log(`Commands: approve (enter) | skip | retry | abort | or type instructions`)
    console.log('─'.repeat(60))

    rl.question('> ', async input => {
      const raw = (input || '').trim()

      if (!raw || raw.toLowerCase() === 'approve') return finish({ intent: 'APPROVE', instruction: '', scope: stepName })
      const lower = raw.toLowerCase()
      if (lower === 'skip')  return finish({ intent: 'SKIP',  instruction: '', scope: stepName })
      if (lower === 'retry') return finish({ intent: 'RETRY', instruction: '', scope: stepName })
      if (lower === 'abort') return finish({ intent: 'ABORT', instruction: '', scope: stepName })

      // Classify free-form input: intent + whether it applies globally to future steps
      try {
        const llm = getProvider()
        const [intentRaw, scopeRaw] = await Promise.all([
          llm.generate(INTENT_SYSTEM, `User input at step "${stepName}": "${raw}"`),
          llm.generate(SCOPE_SYSTEM, `Instruction at step "${stepName}": "${raw}"`),
        ])
        const intent = normalizeIntent(intentRaw)
        const scope = scopeRaw.trim().toLowerCase().startsWith('global') ? 'all' : stepName
        finish({ intent, instruction: raw, scope })
      } catch {
        finish({ intent: 'INSTRUCT', instruction: raw, scope: stepName })
      }
    })
  })
}

function normalizeIntent(raw) {
  const v = String(raw || '').trim().toUpperCase()
  return ['APPROVE', 'SKIP', 'RETRY', 'ABORT', 'INSTRUCT'].includes(v) ? v : 'INSTRUCT'
}

// Web gate: resolves when the browser POSTs to /api/hitl/:runId
// Supports scope forwarded from the browser (for future cross-step carry).
function webGate(stepName, bus, EVENTS) {
  return new Promise(resolve => {
    bus.once(EVENTS.HITL_RESPONSE, ({ intent = 'APPROVE', instruction = '', scope }) => {
      resolve({ intent, instruction, scope: scope || stepName })
    })
    bus.emit(EVENTS.HITL_PROMPT, { step: stepName })
  })
}

module.exports = { gate, webGate }
