#!/usr/bin/env node

const { setMockMode } = require('../test-env/utils/envManager.cjs')
const { startMockServer } = require('../test-env/server/mockServer.cjs')

async function quickDemo() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     Complyment Connectors SDK - Quick Demo                ║
╚════════════════════════════════════════════════════════════╝
`)

  console.log('Starting mock server...')
  await startMockServer(3100)
  setMockMode()

  console.log('\n✓ Mock server running at http://localhost:3100')
  console.log('✓ Environment set to MOCK mode')
  console.log('\nTesting endpoints...\n')

  const endpoints = [
    { name: 'Health Check', url: 'http://localhost:3100/api/health' },
    { name: 'Qualys Vulnerabilities', url: 'http://localhost:3100/api/qualys/vulns' },
    { name: 'SentinelOne Threats', url: 'http://localhost:3100/api/sentinelone/threats' },
    { name: 'Jira Issues', url: 'http://localhost:3100/api/jira/issues' },
  ]

  for (const endpoint of endpoints) {
    try {
      const start = Date.now()
      const res = await fetch(endpoint.url)
      const data = await res.json()
      const latency = Date.now() - start

      const status = res.ok ? '✓' : '✗'
      console.log(`${status} ${endpoint.name} (${latency}ms) - Status: ${res.status}`)
    } catch (error) {
      console.log(`✗ ${endpoint.name} - FAILED`)
    }
  }

  console.log(`
╔════════════════════════════════════════════════════════════╗
║                    Demo Complete!                          ║
╠════════════════════════════════════════════════════════════╣
║  Next steps:                                                ║
║    npm run eval        # Interactive evaluation           ║
║    npm run demo:qualys # Test specific connector          ║
║    npm run demo:ai     # Test AI adapters                 ║
╚════════════════════════════════════════════════════════════╝
`)
}

quickDemo().catch(console.error)