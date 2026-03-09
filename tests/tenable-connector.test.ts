// ============================================
// TENABLE CONNECTOR TEST
// ============================================
// Run: npx ts-node tests/tenable-connector.test.ts
// ============================================

import {
  TenableIoConnector,
  TenableIoConfig,
  TenableIoSeverity,
  TenableIoVulnState,
  TENABLE_IO_API_PATHS,
  TENABLE_IO_DEFAULTS,
  TENABLE_IO_SEVERITY_MAP,
} from '../src/connectors/tenable-io'

import {
  TenableScConnector,
  TenableScConfig,
  TenableScAnalysisType,
  TenableScSourceType,
  TENABLE_SC_API_PATHS,
  TENABLE_SC_DEFAULTS,
  TENABLE_SC_SEVERITY_MAP,
} from '../src/connectors/tenable-sc'

// ============================================
// Test Configuration
// ============================================

const TENABLE_IO_CONFIG: TenableIoConfig = {
  baseUrl: process.env.TENABLE_IO_BASE_URL || TENABLE_IO_DEFAULTS.BASE_URL,
  accessKey: process.env.TENABLE_IO_ACCESS_KEY || '93b2d10e345f5fd5a667e53c677f44791139e4a2a6dc690488166a356169aa5f',
  secretKey: process.env.TENABLE_IO_SECRET_KEY || 'ea9008279271b9472762684c63313c19effa3e7a11aba18b543704afd808460b',
  timeout: 30000,
  dryRun: process.env.TENABLE_DRY_RUN !== 'false', // Default: true (dry run mode)
}

const TENABLE_SC_CONFIG: TenableScConfig = {
  baseUrl: process.env.TENABLE_SC_BASE_URL || 'https://tenable-sc.example.com',
  accessKey: process.env.TENABLE_SC_ACCESS_KEY || 'test_access_key',
  secretKey: process.env.TENABLE_SC_SECRET_KEY || 'test_secret_key',
  timeout: 30000,
  dryRun: process.env.TENABLE_DRY_RUN !== 'false', // Default: true (dry run mode)
}

// ============================================
// Test Utilities
// ============================================

let passCount = 0
let failCount = 0

function test(name: string, fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn()
      console.log(`  ✅ PASS: ${name}`)
      passCount++
    } catch (error: any) {
      console.log(`  ❌ FAIL: ${name}`)
      console.log(`     Error: ${error.message}`)
      failCount++
    }
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`)
  }
}

function assertDefined<T>(value: T | undefined | null, message: string): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(`${message}: value is undefined or null`)
  }
}

// ============================================
// TENABLE.IO UNIT TESTS
// ============================================

console.log('\n' + '='.repeat(60))
console.log('TENABLE.IO CONNECTOR TESTS')
console.log('='.repeat(60))

// Constants Tests
const testIoConstants = test('Tenable.io constants are defined correctly', () => {
  assertEqual(TENABLE_IO_DEFAULTS.BASE_URL, 'https://cloud.tenable.com', 'Base URL should match')
  assertEqual(TENABLE_IO_DEFAULTS.TIMEOUT_MS, 60000, 'Timeout should be 60000ms')
  assertEqual(TENABLE_IO_DEFAULTS.MAX_RETRIES, 3, 'Max retries should be 3')
  assertEqual(TENABLE_IO_SEVERITY_MAP[4], 'critical', 'Severity 4 should be critical')
  assertEqual(TENABLE_IO_SEVERITY_MAP[0], 'info', 'Severity 0 should be info')
})

// API Paths Tests
const testIoApiPaths = test('Tenable.io API paths are correct', () => {
  assertEqual(TENABLE_IO_API_PATHS.ASSETS, '/assets', 'Assets path should match')
  assertEqual(TENABLE_IO_API_PATHS.SCANS, '/scans', 'Scans path should match')
  assertEqual(TENABLE_IO_API_PATHS.USERS, '/users', 'Users path should match')
  assertEqual(TENABLE_IO_API_PATHS.ASSET_BY_ID('test-uuid'), '/assets/test-uuid', 'Asset by ID path should match')
  assertEqual(TENABLE_IO_API_PATHS.SCAN_LAUNCH('123'), '/scans/123/launch', 'Scan launch path should match')
})

// Enums Tests
const testIoEnums = test('Tenable.io enums are defined correctly', () => {
  assertEqual(TenableIoSeverity.CRITICAL, 'critical', 'CRITICAL severity should match')
  assertEqual(TenableIoSeverity.HIGH, 'high', 'HIGH severity should match')
  assertEqual(TenableIoVulnState.OPEN, 'open', 'OPEN state should match')
  assertEqual(TenableIoVulnState.FIXED, 'fixed', 'FIXED state should match')
})

// Connector Initialization Test
const testIoConnectorInit = test('Tenable.io connector initializes correctly', () => {
  const connector = new TenableIoConnector(TENABLE_IO_CONFIG)
  assertDefined(connector, 'Connector should be created')
  assertEqual(connector.getConfig().name, 'tenable-io', 'Connector name should be tenable-io')
  assertEqual(connector.getConfig().baseUrl, TENABLE_IO_CONFIG.baseUrl, 'Base URL should match config')
})

// Dry Run Tests
const testIoConnectorDryRun = test('Tenable.io connector dry run mode works', async () => {
  const connector = new TenableIoConnector({ ...TENABLE_IO_CONFIG, dryRun: true })

  // These should return dry run responses
  const assetsResponse = await connector.getAssets()
  assertEqual(assetsResponse.dryRun, true, 'Response should indicate dry run mode')
  assertEqual(assetsResponse.connector, 'tenable-io', 'Connector name should be in response')

  const scansResponse = await connector.getScans()
  assertEqual(scansResponse.dryRun, true, 'Scans response should indicate dry run mode')

  const usersResponse = await connector.getUsers()
  assertEqual(usersResponse.dryRun, true, 'Users response should indicate dry run mode')
})

// Severity Mapping Test
const testIoSeverityMapping = test('Tenable.io severity mapping works', () => {
  const connector = new TenableIoConnector(TENABLE_IO_CONFIG)
  assertEqual(connector.getSeverityName(4), 'critical', 'Severity 4 should map to critical')
  assertEqual(connector.getSeverityName(3), 'high', 'Severity 3 should map to high')
  assertEqual(connector.getSeverityName(2), 'medium', 'Severity 2 should map to medium')
  assertEqual(connector.getSeverityName(1), 'low', 'Severity 1 should map to low')
  assertEqual(connector.getSeverityName(0), 'info', 'Severity 0 should map to info')
})

// ============================================
// TENABLE.SC UNIT TESTS
// ============================================

console.log('\n' + '='.repeat(60))
console.log('TENABLE.SC CONNECTOR TESTS')
console.log('='.repeat(60))

// Constants Tests
const testScConstants = test('Tenable.sc constants are defined correctly', () => {
  assertEqual(TENABLE_SC_DEFAULTS.TIMEOUT_MS, 60000, 'Timeout should be 60000ms')
  assertEqual(TENABLE_SC_DEFAULTS.MAX_RETRIES, 3, 'Max retries should be 3')
  assertEqual(TENABLE_SC_DEFAULTS.START_OFFSET, 0, 'Start offset should be 0')
  assertEqual(TENABLE_SC_DEFAULTS.END_OFFSET, 1000, 'End offset should be 1000')
  assertEqual(TENABLE_SC_SEVERITY_MAP['4'], 'critical', 'Severity 4 should be critical')
  assertEqual(TENABLE_SC_SEVERITY_MAP['0'], 'info', 'Severity 0 should be info')
})

// API Paths Tests
const testScApiPaths = test('Tenable.sc API paths are correct', () => {
  assertEqual(TENABLE_SC_API_PATHS.ASSETS, '/rest/asset', 'Assets path should match')
  assertEqual(TENABLE_SC_API_PATHS.ANALYSIS, '/rest/analysis', 'Analysis path should match')
  assertEqual(TENABLE_SC_API_PATHS.USERS, '/rest/user', 'Users path should match')
  assertEqual(TENABLE_SC_API_PATHS.POLICIES, '/rest/policy', 'Policies path should match')
  assertEqual(TENABLE_SC_API_PATHS.ASSET_BY_ID('123'), '/rest/asset/123', 'Asset by ID path should match')
})

// Enums Tests
const testScEnums = test('Tenable.sc enums are defined correctly', () => {
  assertEqual(TenableScAnalysisType.VULN, 'vuln', 'VULN type should match')
  assertEqual(TenableScAnalysisType.EVENT, 'event', 'EVENT type should match')
  assertEqual(TenableScSourceType.CUMULATIVE, 'cumulative', 'CUMULATIVE source should match')
  assertEqual(TenableScSourceType.PATCHED, 'patched', 'PATCHED source should match')
})

// Connector Initialization Test
const testScConnectorInit = test('Tenable.sc connector initializes correctly', () => {
  const connector = new TenableScConnector(TENABLE_SC_CONFIG)
  assertDefined(connector, 'Connector should be created')
  assertEqual(connector.getConfig().name, 'tenable-sc', 'Connector name should be tenable-sc')
  assertEqual(connector.getConfig().baseUrl, TENABLE_SC_CONFIG.baseUrl, 'Base URL should match config')
})

// Dry Run Tests
const testScConnectorDryRun = test('Tenable.sc connector dry run mode works', async () => {
  const connector = new TenableScConnector({ ...TENABLE_SC_CONFIG, dryRun: true })

  const assetsResponse = await connector.getAssets()
  assertEqual(assetsResponse.dryRun, true, 'Response should indicate dry run mode')
  assertEqual(assetsResponse.connector, 'tenable-sc', 'Connector name should be in response')

  const policiesResponse = await connector.getPolicies()
  assertEqual(policiesResponse.dryRun, true, 'Policies response should indicate dry run mode')

  const usersResponse = await connector.getUsers()
  assertEqual(usersResponse.dryRun, true, 'Users response should indicate dry run mode')
})

// Severity Mapping Test
const testScSeverityMapping = test('Tenable.sc severity mapping works', () => {
  const connector = new TenableScConnector(TENABLE_SC_CONFIG)
  assertEqual(connector.getSeverityName('4'), 'critical', 'Severity 4 should map to critical')
  assertEqual(connector.getSeverityName('3'), 'high', 'Severity 3 should map to high')
  assertEqual(connector.getSeverityName('2'), 'medium', 'Severity 2 should map to medium')
  assertEqual(connector.getSeverityName('1'), 'low', 'Severity 1 should map to low')
  assertEqual(connector.getSeverityName('0'), 'info', 'Severity 0 should map to info')
})

// ============================================
// LIVE API TESTS (Only run when TENABLE_DRY_RUN=false)
// ============================================

const testIoLiveConnection = test('Tenable.io live connection test', async () => {
  if (TENABLE_IO_CONFIG.dryRun) {
    console.log('     ⏭️  Skipped (dry run mode)')
    return
  }

  const connector = new TenableIoConnector(TENABLE_IO_CONFIG)
  const result = await connector.testConnection()
  assert(result === true, 'Connection should succeed')
})

const testIoLiveAssets = test('Tenable.io live assets fetch', async () => {
  if (TENABLE_IO_CONFIG.dryRun) {
    console.log('     ⏭️  Skipped (dry run mode)')
    return
  }

  const connector = new TenableIoConnector(TENABLE_IO_CONFIG)
  const response = await connector.getAssets()
  assert(response.success === true, 'Assets fetch should succeed')
  assertDefined(response.data, 'Response should have data')
})

const testScLiveConnection = test('Tenable.sc live connection test', async () => {
  if (TENABLE_SC_CONFIG.dryRun) {
    console.log('     ⏭️  Skipped (dry run mode)')
    return
  }

  const connector = new TenableScConnector(TENABLE_SC_CONFIG)
  const result = await connector.testConnection()
  assert(result === true, 'Connection should succeed')
})

const testScLiveAssets = test('Tenable.sc live assets fetch', async () => {
  if (TENABLE_SC_CONFIG.dryRun) {
    console.log('     ⏭️  Skipped (dry run mode)')
    return
  }

  const connector = new TenableScConnector(TENABLE_SC_CONFIG)
  const response = await connector.getAssets()
  assert(response.success === true, 'Assets fetch should succeed')
  assertDefined(response.data, 'Response should have data')
})

// ============================================
// Run All Tests
// ============================================

async function runTests() {
  console.log('\n📋 Running Tenable Connector Tests...')
  console.log(`   Mode: ${TENABLE_IO_CONFIG.dryRun ? 'DRY RUN (no API calls)' : 'LIVE (real API calls)'}`)

  // Tenable.io tests
  console.log('\n🔵 Tenable.io Unit Tests:')
  await testIoConstants()
  await testIoApiPaths()
  await testIoEnums()
  await testIoConnectorInit()
  await testIoConnectorDryRun()
  await testIoSeverityMapping()

  // Tenable.sc tests
  console.log('\n🟢 Tenable.sc Unit Tests:')
  await testScConstants()
  await testScApiPaths()
  await testScEnums()
  await testScConnectorInit()
  await testScConnectorDryRun()
  await testScSeverityMapping()

  // Live API tests
  console.log('\n🌐 Live API Tests:')
  await testIoLiveConnection()
  await testIoLiveAssets()
  await testScLiveConnection()
  await testScLiveAssets()

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('TEST SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Passed: ${passCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log(`📊 Total:  ${passCount + failCount}`)
  console.log('='.repeat(60))

  if (failCount > 0) {
    process.exit(1)
  }
}

runTests().catch(console.error)
