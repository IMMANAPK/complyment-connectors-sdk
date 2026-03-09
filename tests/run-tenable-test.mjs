// Quick test runner for Tenable connectors
// Run: node tests/run-tenable-test.mjs

import pkg from '../dist/index.js'
const { TenableIoConnector } = pkg

console.log('='.repeat(60))
console.log('TENABLE.IO CONNECTOR LIVE TEST')
console.log('='.repeat(60))

const config = {
  accessKey: process.env.TENABLE_IO_ACCESS_KEY || '93b2d10e345f5fd5a667e53c677f44791139e4a2a6dc690488166a356169aa5f',
  secretKey: process.env.TENABLE_IO_SECRET_KEY || 'ea9008279271b9472762684c63313c19effa3e7a11aba18b543704afd808460b',
  timeout: 60000,
  dryRun: false, // Set to true for dry run
}

console.log('\n📋 Configuration:')
console.log(`   Base URL: https://cloud.tenable.com`)
console.log(`   Access Key: ${config.accessKey.substring(0, 8)}...`)
console.log(`   Dry Run: ${config.dryRun}`)

const connector = new TenableIoConnector(config)

async function runTests() {
  try {
    // Test 1: Connection Test
    console.log('\n🔍 Test 1: Testing connection...')
    const connected = await connector.testConnection()
    console.log(`   Result: ${connected ? '✅ Connected' : '❌ Failed'}`)

    if (!connected) {
      console.log('\n⚠️  Connection failed. Please check your API credentials.')
      return
    }

    // Test 2: Get Server Info
    console.log('\n🔍 Test 2: Getting server info...')
    const serverInfo = await connector.getServerInfo()
    if (serverInfo.success) {
      console.log('   ✅ Server Info retrieved')
      console.log(`   Server Version: ${serverInfo.data?.server_version || 'N/A'}`)
    } else {
      console.log(`   ❌ Failed: ${serverInfo.error}`)
    }

    // Test 3: Get Assets
    console.log('\n🔍 Test 3: Getting assets...')
    const assets = await connector.getAssets()
    if (assets.success) {
      console.log(`   ✅ Assets retrieved: ${assets.data?.assets?.length || 0} assets`)
    } else {
      console.log(`   ❌ Failed: ${assets.error}`)
    }

    // Test 4: Get Scans
    console.log('\n🔍 Test 4: Getting scans...')
    const scans = await connector.getScans()
    if (scans.success) {
      console.log(`   ✅ Scans retrieved: ${scans.data?.scans?.length || 0} scans`)
    } else {
      console.log(`   ❌ Failed: ${scans.error}`)
    }

    // Test 5: Get Users
    console.log('\n🔍 Test 5: Getting users...')
    const users = await connector.getUsers()
    if (users.success) {
      console.log(`   ✅ Users retrieved: ${users.data?.users?.length || 0} users`)
    } else {
      console.log(`   ❌ Failed: ${users.error}`)
    }

    // Test 6: Get Workbench Vulnerabilities
    console.log('\n🔍 Test 6: Getting workbench vulnerabilities...')
    const vulns = await connector.getWorkbenchVulnerabilities({ date_range: 30 })
    if (vulns.success) {
      console.log(`   ✅ Vulnerabilities retrieved: ${vulns.data?.vulnerabilities?.length || 0} vulnerabilities`)
    } else {
      console.log(`   ❌ Failed: ${vulns.error}`)
    }

    // Test 7: Get Statistics
    console.log('\n🔍 Test 7: Getting statistics...')
    const stats = await connector.getStats()
    if (stats.success && stats.data) {
      console.log('   ✅ Statistics retrieved:')
      console.log(`      Total Assets: ${stats.data.summary.totalAssets}`)
      console.log(`      Total Scans: ${stats.data.summary.totalScans}`)
      console.log(`      Total Users: ${stats.data.summary.totalUsers}`)
      console.log(`      Total Agents: ${stats.data.summary.totalAgents}`)
    } else {
      console.log(`   ❌ Failed: ${stats.error}`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ ALL TESTS COMPLETED')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n❌ Test Error:', error.message)
  }
}

runTests()
