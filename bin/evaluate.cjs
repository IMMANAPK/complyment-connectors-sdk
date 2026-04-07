#!/usr/bin/env node

const { setMockMode, isMockMode } = require('../test-env/utils/envManager.cjs')
const { startMockServer } = require('../test-env/server/mockServer.cjs')

const rl = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
})

const results = []

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer))
  })
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   Complyment Connectors SDK - Interactive Evaluation       ║
╚════════════════════════════════════════════════════════════╝
`)

  const mode = await ask('Start in mock mode? (y/n): ')

  if (mode.toLowerCase() === 'y') {
    console.log('Starting mock server...')
    await startMockServer(3100)
    setMockMode()
    console.log('Mock server running at http://localhost:3100\n')
  }

  console.log('Available commands: test qualys, test sentinelone, test all, validate, summary, help, exit')

  await evaluationLoop()

  rl.close()
}

async function evaluationLoop() {
  while (true) {
    const input = await ask('complyment> ')
    const cmd = input.trim().toLowerCase()

    if (cmd === 'exit' || cmd === 'quit') {
      printSummary()
      break
    }

    if (cmd === 'help') {
      console.log(`
Commands:
  test qualys         Test Qualys connector
  test sentinelone     Test SentinelOne connector
  test all            Test all connectors
  validate            Validate fixture schemas
  summary             Show evaluation summary
  help                Show this help
  exit                Exit and show summary
`)
      continue
    }

    if (cmd === 'summary') {
      printSummary()
      continue
    }

    if (cmd === 'test qualys') {
      await testConnector('qualys', 'vulns')
      continue
    }

    if (cmd === 'test sentinelone') {
      await testConnector('sentinelone', 'threats')
      continue
    }

    if (cmd === 'test all') {
      await testAllConnectors()
      continue
    }

    if (cmd === 'validate') {
      await validateFixtures()
      continue
    }

    console.log('Unknown command. Type "help" for available commands.')
  }
}

async function testConnector(connector, operation) {
  const start = Date.now()
  console.log(`Testing ${connector}.${operation}...`)

  try {
    const response = await fetch(`http://localhost:3100/api/${connector}/${operation}`)
    const data = await response.json()
    const latency = Date.now() - start

    results.push({
      connector,
      operation,
      success: response.ok,
      latencyMs: latency,
      validated: true,
    })

    console.log(`✓ ${connector}.${operation} - ${latency}ms - Status: ${response.status}`)
  } catch (error) {
    results.push({
      connector,
      operation,
      success: false,
      error: error.message,
      validated: false,
    })
    console.log(`✗ ${connector}.${operation} - FAILED: ${error.message}`)
  }
}

async function testAllConnectors() {
  const connectors = [
    { name: 'qualys', op: 'vulns' },
    { name: 'sentinelone', op: 'threats' },
    { name: 'jira', op: 'issues' },
    { name: 'tenable-io', op: 'vulns' },
  ]

  console.log('\nRunning all connector tests...\n')

  for (const { name, op } of connectors) {
    await testConnector(name, op)
  }
}

async function validateFixtures() {
  console.log('\nValidating fixtures with Zod schemas...\n')

  const { validateVulnerability } = require('../test-env/utils/validation.cjs')

  const qualysVulns = {
    id: 'vuln-001',
    qid: 12345,
    title: 'SQL Injection',
    severity: 5,
    cvss: 9.8,
  }

  const result = validateVulnerability(qualysVulns)
  console.log(`Qualys vulnerability validation: ${result.success ? 'PASSED' : 'FAILED'}`)

  if (!result.success) {
    console.log('Errors:', result.error.issues)
  }
}

function printSummary() {
  console.log('\n=== Evaluation Summary ===\n')

  const passed = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length
  const avgLatency = results.reduce((sum, r) => sum + (r.latencyMs ?? 0), 0) / results.length

  console.log(`Total Tests: ${results.length}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log(`Avg Latency: ${avgLatency.toFixed(2)}ms`)
  console.log(`Mode: ${isMockMode() ? 'MOCK' : 'REAL'}`)

  if (failed > 0) {
    console.log('\nFailed Tests:')
    results.filter((r) => !r.success).forEach((r) => {
      console.log(`  - ${r.connector}.${r.operation}: ${r.error}`)
    })
  }
}

main().catch(console.error)