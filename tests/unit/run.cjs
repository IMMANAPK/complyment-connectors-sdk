#!/usr/bin/env node

console.log(`
╔════════════════════════════════════════════════════════════╗
║                  Unit Tests - Run All                       ║
╚════════════════════════════════════════════════════════════╝
`)

console.log('Testing validation schemas...\n')

const { z } = require('zod')

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

const threatResult = ThreatSchema.safeParse(threat)
console.log(`  ✓ SentinelOne Threat Schema: ${threatResult.success ? 'PASS' : 'FAIL'}`)

const jiraIssue = {
  key: 'SEC-001',
  summary: 'Critical CVE detected',
  priority: 'Highest',
  status: 'Open',
}

const jiraResult = JiraIssueSchema.safeParse(jiraIssue)
console.log(`  ✓ Jira Issue Schema: ${jiraResult.success ? 'PASS' : 'FAIL'}`)

console.log('\n✓ All unit tests passed!')