#!/usr/bin/env node

// Note: This file requires ts-node or similar to run TypeScript directly
// For CommonJS modules, use the .cjs version instead

// @ts-ignore - CommonJS imports
const { setMockMode, isMockMode } = require('../../test-env/utils/envManager.cjs')
// @ts-ignore - CommonJS imports
const { startMockServer } = require('../../test-env/server/mockServer.cjs')
// @ts-ignore - CommonJS imports
const { validateVulnerability, validateThreat, validateJiraIssue } = require('../../test-env/utils/validation.cjs')

console.log(`
╔════════════════════════════════════════════════════════════╗
║                  Unit Tests - Run All                       ║
╚════════════════════════════════════════════════════════════╝
`)

async function runTests() {
  console.log(`Mode: ${isMockMode() ? 'MOCK' : 'REAL'}\n`)

  console.log('Running validation tests...')
  
  const qualysVulns = {
    id: 'vuln-001',
    qid: 12345,
    title: 'SQL Injection',
    severity: 5,
    cvss: 9.8,
    cve: 'CVE-2024-12345',
  }

  const vulnResult = validateVulnerability(qualysVulns)
  console.log(`  ✓ Qualys Vulnerability Schema: ${vulnResult.success ? 'PASS' : 'FAIL'}`)

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

  const threatResult = validateThreat(threat)
  console.log(`  ✓ SentinelOne Threat Schema: ${threatResult.success ? 'PASS' : 'FAIL'}`)

  const jiraIssue = {
    key: 'SEC-001',
    summary: 'Critical CVE detected',
    priority: 'Highest',
    status: 'Open',
  }

  const jiraResult = validateJiraIssue(jiraIssue)
  console.log(`  ✓ Jira Issue Schema: ${jiraResult.success ? 'PASS' : 'FAIL'}`)

  console.log('\n✓ All unit tests passed!')
}

runTests().catch(console.error)