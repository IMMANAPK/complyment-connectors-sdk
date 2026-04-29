#!/usr/bin/env node

console.log(`
╔════════════════════════════════════════════════════════════╗
║                  Unit Tests - Run All                       ║
╚════════════════════════════════════════════════════════════╝
`)

console.log('Testing validation schemas...\n')

const { z } = require('zod')
const sdk = require('../../dist/index.js')
const failures = []

const VulnerabilitySchema = z.object({
  id: z.string(),
  qid: z.number(),
  title: z.string(),
  severity: z.number().min(1).max(5),
  cvss: z.number().min(0).max(10),
  cve: z.string().optional(),
})

const ThreatSchema = z.object({
  id: z.string(),
  name: z.string(),
  threatType: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  status: z.enum(['active', 'quarantined', 'resolved']),
  createdAt: z.string().datetime(),
  agent: z.object({
    id: z.string(),
    hostname: z.string(),
    ip: z.string(),
    os: z.string(),
  }),
})

const JiraIssueSchema = z.object({
  key: z.string(),
  summary: z.string(),
  priority: z.string(),
  status: z.string(),
})

const qualysVulns = {
  id: 'vuln-001',
  qid: 12345,
  title: 'SQL Injection',
  severity: 5,
  cvss: 9.8,
}

const vulnResult = VulnerabilitySchema.safeParse(qualysVulns)
recordResult('Qualys Vulnerability Schema', vulnResult)

const threat = {
  id: 'threat-001',
  name: 'Trojan.Generic',
  threatType: 'Trojan',
  severity: 'critical',
  status: 'active',
  createdAt: '2024-03-20T14:30:00Z',
  agent: {
    id: 'agent-001',
    hostname: 'DESKTOP-XYZ',
    ip: '192.168.1.50',
    os: 'Windows 11',
  },
}

const threatResult = ThreatSchema.safeParse(threat)
recordResult('SentinelOne Threat Schema', threatResult)

const jiraIssue = {
  key: 'SEC-001',
  summary: 'Critical CVE detected',
  priority: 'Highest',
  status: 'Open',
}

const jiraResult = JiraIssueSchema.safeParse(jiraIssue)
recordResult('Jira Issue Schema', jiraResult)

console.log('\nTesting SDK core behavior...\n')

class TestConnector extends sdk.BaseConnector {
  async authenticate() {}
  async testConnection() {
    return true
  }

  async fetch(url, params, useCache = false) {
    return this.get(url, params, useCache)
  }

  async send(url, body, useCache = false) {
    return this.post(url, body, useCache)
  }

  setAdapter(adapter) {
    this.httpClient.defaults.adapter = adapter
  }
}

async function runCoreTests() {
  await test('BaseConnector strips auth from getConfig()', async () => {
    const connector = new TestConnector({
      name: 'test',
      baseUrl: 'https://example.test',
      auth: { type: sdk.AuthType.BASIC, username: 'user', password: 'secret' },
    })

    const config = connector.getConfig()
    assert(config.name === 'test', 'name should be retained')
    assert(!Object.prototype.hasOwnProperty.call(config, 'auth'), 'auth should not be exposed')
  })

  await test('BaseConnector dry run avoids HTTP calls', async () => {
    const connector = new TestConnector({
      name: 'dry',
      baseUrl: 'https://example.test',
      auth: { type: sdk.AuthType.BEARER, token: 'token' },
      dryRun: true,
    })

    connector.setAdapter(async () => {
      throw new Error('adapter should not be called in dry run')
    })

    const result = await connector.fetch('/anything')
    assert(result.success === true, 'dry run should succeed')
    assert(result.dryRun === true, 'dry run flag should be present')
  })

  await test('BaseConnector injects basic auth headers', async () => {
    const connector = new TestConnector({
      name: 'auth',
      baseUrl: 'https://example.test',
      auth: { type: sdk.AuthType.BASIC, username: 'alice', password: 'secret' },
    })

    let authorization
    connector.setAdapter(async (config) => {
      authorization = readHeader(config.headers, 'Authorization')
      return adapterResponse(config, { ok: true })
    })

    await connector.fetch('/secure')
    assert(authorization === `Basic ${Buffer.from('alice:secret').toString('base64')}`, 'basic auth header should be encoded')
  })

  await test('BaseConnector caches GET responses per params', async () => {
    const connector = new TestConnector({
      name: 'cache',
      baseUrl: 'https://example.test',
      auth: { type: sdk.AuthType.API_KEY, apiKey: 'key' },
      cache: { enabled: true, ttl: 60 },
    })

    let calls = 0
    connector.setAdapter(async (config) => {
      calls += 1
      return adapterResponse(config, { call: calls, params: config.params })
    })

    const first = await connector.fetch('/items', { page: 1 }, true)
    const second = await connector.fetch('/items', { page: 1 }, true)
    const third = await connector.fetch('/items', { page: 2 }, true)

    assert(first.data.call === 1, 'first call should hit adapter')
    assert(second.cached === true && second.data.call === 1, 'same params should hit cache')
    assert(third.data.call === 2, 'different params should not reuse cached data')
  })
}

runCoreTests()
  .then(runRegistryTests)
  .then(runMiddlewareTests)
  .then(runNormalizationTests)
  .then(runQualysConnectorTests)
  .then(runTenableConnectorTests)
  .then(runPackageImportTests)
  .then(finish)
  .catch((error) => {
    failures.push({ name: 'Unexpected test runner error', error })
    finish()
  })

function adapterResponse(config, data) {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    request: {},
  }
}

function readHeader(headers, name) {
  if (!headers) return undefined
  if (typeof headers.get === 'function') return headers.get(name)
  return headers[name] ?? headers[name.toLowerCase()]
}

async function runRegistryTests() {
  console.log('\nTesting connector registry...\n')

  await test('ConnectorRegistry registers, lists, and unregisters connectors', async () => {
    const registry = new sdk.ConnectorRegistry()
    const connector = new TestConnector({
      name: 'registry-test',
      baseUrl: 'https://example.test',
      auth: { type: sdk.AuthType.BEARER, token: 'token' },
      dryRun: true,
    })

    registry.register('registry-test', connector)
    assert(registry.has('registry-test'), 'registered connector should exist')
    assert(registry.get('registry-test') === connector, 'get should return same connector instance')
    assert(registry.list().includes('registry-test'), 'list should include connector name')
    assert(registry.size() === 1, 'size should reflect registered connector')
    registry.unregister('registry-test')
    assert(!registry.has('registry-test'), 'unregister should remove connector')
  })

  await test('ConnectorRegistry rejects duplicates and missing connectors', async () => {
    const registry = new sdk.ConnectorRegistry()
    const connector = new TestConnector({
      name: 'dup-test',
      baseUrl: 'https://example.test',
      auth: { type: sdk.AuthType.BEARER, token: 'token' },
      dryRun: true,
    })

    registry.register('dup-test', connector)
    assertThrows(() => registry.register('dup-test', connector), 'DUPLICATE_PLUGIN')
    assertThrows(() => registry.get('missing'), 'PLUGIN_NOT_FOUND')
  })
}

async function runMiddlewareTests() {
  console.log('\nTesting middleware utilities...\n')

  await test('CacheLayer returns hits, misses, and evicts least recently used entries', async () => {
    const evicted = []
    const cache = new sdk.CacheLayer({
      ttl: 60,
      maxSize: 2,
      onEvict: (key) => evicted.push(key),
    })

    cache.set('a', 1)
    cache.set('b', 2)
    assert(cache.get('a') === 1, 'a should be cached')
    cache.set('c', 3)

    assert(cache.get('b') === null, 'least recently used key should be evicted')
    assert(cache.get('a') === 1, 'recently used key should remain')
    assert(cache.get('c') === 3, 'new key should be cached')
    assert(evicted[0] === 'b', 'eviction callback should report evicted key')
  })

  await test('CacheLayer updating an existing key does not evict itself', async () => {
    const cache = new sdk.CacheLayer({ ttl: 60, maxSize: 1 })
    cache.set('same', 1)
    cache.set('same', 2)
    assert(cache.get('same') === 2, 'existing key update should keep latest value')
    assert(cache.getStats().totalEvictions === 0, 'existing key update should not count as eviction')
  })

  await test('CircuitBreaker opens after failures and recovers after successful half-open attempt', async () => {
    const transitions = []
    const breaker = new sdk.CircuitBreaker({
      failureThreshold: 2,
      successThreshold: 1,
      recoveryTimeMs: 0,
      onStateChange: (from, to) => transitions.push(`${from}->${to}`),
    })

    await assertRejects(() => breaker.execute(async () => { throw new Error('first') }))
    await assertRejects(() => breaker.execute(async () => { throw new Error('second') }))
    assert(breaker.isOpen(), 'breaker should open after threshold failures')

    const result = await breaker.execute(async () => 'ok')
    assert(result === 'ok', 'half-open success should return operation result')
    assert(breaker.isClosed(), 'breaker should close after successful half-open call')
    assert(transitions.includes('closed->open'), 'should record opening transition')
    assert(transitions.includes('open->half-open'), 'should record half-open transition')
    assert(transitions.includes('half-open->closed'), 'should record closing transition')
  })

  await test('RateLimiter tryAcquire respects token capacity', async () => {
    const limiter = new sdk.RateLimiter({ maxRequests: 1, perSeconds: 60 })
    assert(limiter.tryAcquire() === true, 'first token should be available')
    assert(limiter.tryAcquire() === false, 'second token should be denied before refill')
  })
}

async function runNormalizationTests() {
  console.log('\nTesting normalization helpers...\n')

  await test('cvssToSeverity maps boundary scores correctly', async () => {
    assert(sdk.cvssToSeverity(9.0) === 'critical', '9.0 should be critical')
    assert(sdk.cvssToSeverity(7.0) === 'high', '7.0 should be high')
    assert(sdk.cvssToSeverity(4.0) === 'medium', '4.0 should be medium')
    assert(sdk.cvssToSeverity(0.1) === 'low', '0.1 should be low')
    assert(sdk.cvssToSeverity(0) === 'info', '0 should be info')
  })

  await test('validateAssets rejects out-of-range IPv4 addresses', async () => {
    const result = sdk.validateAssets([
      {
        id: 'asset-1',
        hostname: 'server-1',
        ipAddress: '999.999.999.999',
        type: 'server',
        source: 'unit',
        lastSeen: new Date(),
      },
    ])

    assert(result.valid.length === 0, 'invalid IP should not be accepted')
    assert(result.invalid.length === 1, 'invalid IP should be reported')
  })

  await test('detectAssetType identifies common asset categories', async () => {
    assert(sdk.detectAssetType('prod-server-01', 'Ubuntu 22.04') === 'server', 'server host should be detected')
    assert(sdk.detectAssetType('desktop-01', 'Windows 11') === 'workstation', 'desktop host should be detected')
    assert(sdk.detectAssetType('edge-router-01') === 'network', 'router host should be detected')
    assert(sdk.detectAssetType('aws-worker-01') === 'cloud', 'cloud host should be detected')
  })
}

async function runPackageImportTests() {
  console.log('\nTesting package imports...\n')

  await test('CommonJS package import exposes primary public API', async () => {
    assert(Boolean(sdk.QualysConnector), 'QualysConnector should be exported')
    assert(Boolean(sdk.TenableIoConnector), 'TenableIoConnector should be exported')
    assert(Boolean(sdk.GoogleADKAdapter), 'GoogleADKAdapter should be exported')
    assert(sdk.SDK_VERSION === '0.3.4', 'SDK version should match package version')
  })

  await test('ESM package import exposes primary public API', async () => {
    const esm = await import('../../dist/index.mjs')
    assert(Boolean(esm.QualysConnector), 'QualysConnector should be exported from ESM build')
    assert(Boolean(esm.TenableIoConnector), 'TenableIoConnector should be exported from ESM build')
    assert(Boolean(esm.GoogleADKAdapter), 'GoogleADKAdapter should be exported from ESM build')
    assert(esm.SDK_VERSION === '0.3.4', 'ESM SDK version should match package version')
  })
}

async function runQualysConnectorTests() {
  console.log('\nTesting Qualys connector and parsers...\n')

  await test('Qualys constants and enums are exported correctly', async () => {
    assert(sdk.QUALYS_BASE_URLS.US1 === 'https://qualysapi.qualys.com', 'US1 URL should match')
    assert(sdk.QUALYS_BASE_URLS.EU1 === 'https://qualysapi.qualys.eu', 'EU1 URL should match')
    assert(sdk.QUALYS_BASE_URLS.IN1 === 'https://qualysapi.qg1.apps.qualys.in', 'IN1 URL should match')
    assert(sdk.QUALYS_SEVERITY_MAP[5] === 'Critical', 'severity 5 should be Critical')
    assert(sdk.QualysScanStatus.RUNNING === 'Running', 'RUNNING status should match')
    assert(sdk.QualysScanType.VM === 'VM', 'VM scan type should match')
  })

  await test('parseHostDetections handles legacy host detection format', async () => {
    const result = sdk.parseHostDetections({
      host_list_vm_detection_output: {
        response: {
          host_list: {
            host: [
              {
                id: '12345',
                ip: '192.168.1.100',
                dns: 'server1.example.com',
                os: 'Windows Server 2019',
                detection_list: {
                  detection: [
                    {
                      qid: '90001',
                      severity: '5',
                      status: 'Active',
                      first_found_datetime: '2024-01-01T00:00:00Z',
                      results: 'Vulnerability detected on port 443',
                    },
                    {
                      qid: '90002',
                      severity: '3',
                      status: 'Active',
                      results: 'Medium severity issue',
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    }, 'Legacy Scan')

    assert(result.scanTitle === 'Legacy Scan', 'scan title should match')
    assert(result.hostsScanned === 1, 'one host should be counted')
    assert(result.totalVulnerabilities === 2, 'two vulnerabilities should be counted')
    assert(result.criticalCount === 1, 'one critical vulnerability should be counted')
    assert(result.mediumCount === 1, 'one medium vulnerability should be counted')
    assert(result.vulnerabilities[0].qid === 90001, 'first QID should be parsed')
  })

  await test('parseHostDetections handles QPS host asset format', async () => {
    const result = sdk.parseHostDetections({
      ServiceResponse: {
        data: [
          {
            HostAsset: {
              id: '67890',
              address: '10.0.0.50',
              dnsHostName: 'webserver.example.com',
              os: 'Ubuntu 22.04',
              vuln: {
                list: [
                  {
                    HostAssetVuln: {
                      qid: '80001',
                      severity: '4',
                      firstFound: '2024-02-15T10:00:00Z',
                      port: '22',
                      protocol: 'TCP',
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    }, 'QPS Scan')

    assert(result.hostsScanned === 1, 'one QPS host should be counted')
    assert(result.totalVulnerabilities === 1, 'one QPS vulnerability should be counted')
    assert(result.highCount === 1, 'one high vulnerability should be counted')
    assert(result.vulnerabilities[0].port === 22, 'port should be parsed')
    assert(result.vulnerabilities[0].protocol === 'TCP', 'protocol should be parsed')
  })

  await test('parseVulnerabilityKB and enrichVulnerabilitiesWithKB preserve KB details', async () => {
    const kbMap = sdk.parseVulnerabilityKB({
      knowledge_base_vuln_list_output: {
        response: {
          vuln_list: {
            vuln: [
              {
                qid: '90001',
                title: 'Critical SSL Vulnerability',
                severity_level: '5',
                category: 'SSL',
                patchable: 'true',
                diagnosis: 'SSL certificate is expired',
                solution: 'Renew SSL certificate',
                cvss: { base: '9.8' },
                cvss_v3: { base: '10.0' },
                cve_list: {
                  cve: [{ id: 'CVE-2024-1234' }, { id: 'CVE-2024-5678' }],
                },
                pci_flag: 'true',
              },
            ],
          },
        },
      },
    })

    const entry = kbMap.get(90001)
    assert(entry?.title === 'Critical SSL Vulnerability', 'KB title should be parsed')
    assert(entry?.patchable === true, 'patchable should be parsed')
    assert(entry?.cvssBase === 9.8, 'CVSS base should be parsed')
    assert(entry?.cvss3Base === 10.0, 'CVSS3 base should be parsed')
    assert(entry?.cveList.length === 2, 'CVEs should be parsed')

    const enriched = sdk.enrichVulnerabilitiesWithKB([
      { qid: 90001, title: 'QID-90001', severity: 5, ip: '192.168.1.1' },
    ], kbMap)

    assert(enriched[0].title === 'Critical SSL Vulnerability', 'title should be enriched')
    assert(enriched[0].solution === 'Renew SSL certificate', 'solution should be enriched')
    assert(enriched[0].cveList?.[0] === 'CVE-2024-1234', 'CVE should be enriched')
  })

  await test('QualysConnector dry-run methods return connector response structures', async () => {
    const connector = new sdk.QualysConnector({
      baseUrl: sdk.QUALYS_BASE_URLS.US1,
      username: 'test_user',
      password: 'test_pass',
      dryRun: true,
    })

    const health = await connector.healthCheck()
    const assets = await connector.getAssets()

    assert(health.connector === 'qualys', 'health check connector should be qualys')
    assert('success' in assets, 'assets response should include success')
    assert(assets.connector === 'qualys', 'assets response connector should be qualys')
  })
}

async function runTenableConnectorTests() {
  console.log('\nTesting Tenable connectors...\n')

  await test('Tenable.io constants, paths, enums, and severity map are exported correctly', async () => {
    assert(sdk.TENABLE_IO_DEFAULTS.BASE_URL === 'https://cloud.tenable.com', 'Tenable.io base URL should match')
    assert(sdk.TENABLE_IO_DEFAULTS.TIMEOUT_MS === 60000, 'Tenable.io timeout should match')
    assert(sdk.TENABLE_IO_API_PATHS.ASSETS === '/assets', 'Tenable.io assets path should match')
    assert(sdk.TENABLE_IO_API_PATHS.SCAN_LAUNCH('123') === '/scans/123/launch', 'Tenable.io scan launch path should match')
    assert(sdk.TenableIoSeverity.CRITICAL === 'critical', 'Tenable.io critical enum should match')
    assert(sdk.TenableIoVulnState.OPEN === 'open', 'Tenable.io open state should match')
    assert(sdk.TENABLE_IO_SEVERITY_MAP[4] === 'critical', 'Tenable.io severity 4 should map to critical')
  })

  await test('Tenable.io dry-run connector methods return response structures', async () => {
    const connector = new sdk.TenableIoConnector({
      accessKey: 'test_access_key',
      secretKey: 'test_secret_key',
      dryRun: true,
    })

    const assets = await connector.getAssets()
    const scans = await connector.getScans()
    const users = await connector.getUsers()

    assert(connector.getConfig().name === 'tenable-io', 'connector name should be tenable-io')
    assert(assets.dryRun === true && assets.connector === 'tenable-io', 'assets should be dry-run response')
    assert(scans.dryRun === true, 'scans should be dry-run response')
    assert(users.dryRun === true, 'users should be dry-run response')
    assert(connector.getSeverityName(4) === 'critical', 'severity 4 should map to critical')
    assert(connector.getSeverityName(999) === 'unknown', 'unknown severity should map to unknown')
  })

  await test('Tenable.sc constants, paths, enums, and severity map are exported correctly', async () => {
    assert(sdk.TENABLE_SC_DEFAULTS.TIMEOUT_MS === 60000, 'Tenable.sc timeout should match')
    assert(sdk.TENABLE_SC_DEFAULTS.START_OFFSET === 0, 'Tenable.sc start offset should match')
    assert(sdk.TENABLE_SC_API_PATHS.ASSETS === '/rest/asset', 'Tenable.sc assets path should match')
    assert(sdk.TENABLE_SC_API_PATHS.ASSET_BY_ID('123') === '/rest/asset/123', 'Tenable.sc asset by id path should match')
    assert(sdk.TenableScAnalysisType.VULN === 'vuln', 'Tenable.sc vuln analysis enum should match')
    assert(sdk.TenableScSourceType.CUMULATIVE === 'cumulative', 'Tenable.sc cumulative source enum should match')
    assert(sdk.TENABLE_SC_SEVERITY_MAP['4'] === 'critical', 'Tenable.sc severity 4 should map to critical')
  })

  await test('Tenable.sc dry-run connector methods return response structures', async () => {
    const connector = new sdk.TenableScConnector({
      baseUrl: 'https://tenable-sc.example.com',
      accessKey: 'test_access_key',
      secretKey: 'test_secret_key',
      dryRun: true,
    })

    const assets = await connector.getAssets()
    const policies = await connector.getPolicies()
    const users = await connector.getUsers()

    assert(connector.getConfig().name === 'tenable-sc', 'connector name should be tenable-sc')
    assert(assets.dryRun === true && assets.connector === 'tenable-sc', 'assets should be dry-run response')
    assert(policies.dryRun === true, 'policies should be dry-run response')
    assert(users.dryRun === true, 'users should be dry-run response')
    assert(connector.getSeverityName('4') === 'critical', 'severity 4 should map to critical')
    assert(connector.getSeverityName('999') === 'unknown', 'unknown severity should map to unknown')
  })
}

function recordResult(name, result) {
  const status = result.success ? 'PASS' : 'FAIL'
  console.log(`  ${result.success ? '✓' : '✗'} ${name}: ${status}`)

  if (!result.success) {
    failures.push({ name, error: result.error })
  }
}

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✓ ${name}: PASS`)
  } catch (error) {
    failures.push({ name, error })
    console.log(`  ✗ ${name}: FAIL`)
    console.log(`    ${error instanceof Error ? error.message : String(error)}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertThrows(fn, expectedCode) {
  try {
    fn()
  } catch (error) {
    if (expectedCode) {
      assert(error.code === expectedCode, `expected error code ${expectedCode}, got ${error.code}`)
    }
    return
  }

  throw new Error(`Expected function to throw${expectedCode ? ` ${expectedCode}` : ''}`)
}

async function assertRejects(fn) {
  try {
    await fn()
  } catch {
    return
  }

  throw new Error('Expected promise to reject')
}

function finish() {
  if (failures.length > 0) {
    console.error(`\n✗ ${failures.length} unit test(s) failed`)
    process.exitCode = 1
  } else {
    console.log('\n✓ All unit tests passed!')
  }
}
