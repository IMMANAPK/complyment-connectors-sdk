#!/usr/bin/env node

const { switchEnv } = require('../test-env/utils/envManager.cjs')
const { startMockServer } = require('../test-env/server/mockServer.cjs')

const args = process.argv.slice(2)

async function main() {
  if (args.includes('--mode=mock')) {
    await switchToMock()
  } else if (args.includes('--mode=real')) {
    switchEnv('real')
    console.log('Switched to REAL mode')
    process.exit(0)
  } else if (args.includes('--quick')) {
    await quickDemo()
  } else {
    showHelp()
  }
}

async function switchToMock() {
  console.log('Starting mock server...')
  await startMockServer(3100)
  switchEnv('mock')
  console.log('Switched to MOCK mode')
}

async function quickDemo() {
  console.log('Starting quick demo...')
  await startMockServer(3100)
  switchEnv('mock')
  console.log('Quick demo ready!')
  console.log('\nDemo endpoints:')
  console.log('  GET  http://localhost:3100/api/qualys/vulns')
  console.log('  GET  http://localhost:3100/api/sentinelone/threats')
  console.log('  GET  http://localhost:3100/api/jira/issues')
  console.log('  GET  http://localhost:3100/api/health')
}

function showHelp() {
  console.log(`
Complyment Connectors SDK - Setup Tool

Usage:
  npm run setup -- --mode=mock    Start mock server and switch to mock mode
  npm run setup -- --mode=real    Switch to real API mode
  npm run setup -- --quick        Quick demo mode (start mock + ready)

Environment Variables:
  COMPLYMENT_ENV_MODE           mock | real
  COMPLYMENT_QUALYS_BASE_URL    Real Qualys API URL
  COMPLYMENT_SENTINELONE_BASE_URL  Real SentinelOne API URL
  `)
}

main().catch(console.error)