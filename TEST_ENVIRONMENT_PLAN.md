# Test Environment Plan for SDK Evaluation

## Overview

This document outlines a production-ready test environment that allows users to evaluate the Complyment Connectors SDK before integrating it into their systems.

---

## Why a Test Environment?

Users need to verify:
- SDK capabilities and limitations
- Connector functionality
- AI agent integration compatibility
- Performance characteristics
- Error handling behavior

---

## Architecture

```
test-env/
├── mocks/
│   ├── server.ts              # Express server with error injection
│   ├── errors.ts              # Simulate: rateLimit, timeout, authFailure
│   └── scenarios.ts           # Test scenarios: happy, edge, failure
├── fixtures/                   # Test data with edge cases
├── comparison/
│   └── validate-mocks.ts      # Compare mock vs real API shapes
├── benchmarks/
│   └── performance.ts         # Latency/throughput tests
├── ai-tests/
│   ├── test-mcp.ts           # Test MCP server
│   ├── test-langchain.ts     # Test LangChain adapter
│   └── test-vertex.ts        # Test Google ADK adapter
├── scripts/
│   ├── setup.ts              # One-click environment setup
│   └── switch-env.ts         # Toggle mock/real API
├── .github/workflows/
│   └── test.yml              # CI/CD
└── README.md                  # Full evaluation guide
```

---

## Phase 1: Mock Connectors

### Approach

Simulate real API responses locally using Express.js server.

| Connector | Mock Endpoints |
|-----------|----------------|
| **Qualys** | `/api/vulns`, `/api/assets`, `/api/scans`, `/api/scan/launch` |
| **SentinelOne** | `/api/threats`, `/api/agents`, `/api/quarantine` |
| **Jira** | `/api/issues`, `/api/transitions` |
| **Tenable.io** | `/api/vulns`, `/api/assets`, `/api/scans` |
| **Tenable.sc** | `/api/vulns`, `/api/scans` |
| **Checkpoint** | `/api/policies`, `/api/rules` |
| **ManageEngine** | `/api/patches`, `/api/computers` |
| **Zoho** | `/api/leads`, `/api/contacts` |

### Mock Server Implementation

```typescript
// mocks/server.ts
import express from 'express'
import { errorSimulator } from './errors'

const app = express()

app.get('/api/vulns', (req, res) => {
  // Inject errors if configured
  const error = errorSimulator(req.path)
  if (error) return res.status(error.status).json(error.body)

  res.json(vulnerabilityData)
})
```

---

## Phase 2: Error Injection System

### Why Error Simulation?

Users must test SDK resilience (circuit breaker, retry logic, rate limiting).

### Error Types

| Error Type | Description | Use Case |
|------------|-------------|----------|
| `rate_limit` | HTTP 429 | Test rate limiter |
| `timeout` | Request timeout | Test timeout handling |
| `auth_failure` | HTTP 401/403 | Test token refresh |
| `server_error` | HTTP 500/503 | Test retry logic |
| `connection_refused` | ECONNREFUSED | Test circuit breaker |
| `throttling` | Gradual slowdown | Test backpressure |

### Implementation

```typescript
// mocks/errors.ts
export function errorSimulator(endpoint: string) {
  const config = getErrorConfig() // From environment

  if (config.rateLimit && Math.random() < 0.1) {
    return { status: 429, body: { message: 'Rate limit exceeded' } }
  }

  if (config.timeout && Math.random() < 0.05) {
    // Simulate timeout
  }

  return null // No error
}
```

### Usage

```typescript
// Test with rate limiting
MOCK_ERRORS=rate_limit npm run test

// Test with auth failures
MOCK_ERRORS=auth_failure npm run test

// Test all errors
MOCK_ERRORS=all npm run test
```

---

## Phase 3: Test Fixtures

### Structure

```
tests/fixtures/
├── qualys/
│   ├── vulnerabilities.json       # Normal vuln data
│   ├── critical-vulns.json         # Critical severity
│   ├── empty-results.json          # No findings
│   └── malformed.json              # Edge case
├── sentinelone/
│   ├── threats.json
│   ├── ransomware-threats.json
│   └── agents.json
└── ...
```

### Fixture Types

1. **Happy Path** - Standard response data
2. **Edge Cases** - Empty results, max size, pagination
3. **Malformed Data** - Missing fields, wrong types
4. **Large Data** - Performance testing

---

## Phase 4: Comparison Testing

### Purpose

Validate that mock responses match real API response shapes.

```typescript
// comparison/validate-mocks.ts
import { realClient } from './real-clients'
import { mockClient } from '../mocks'

async function validateShapes() {
  const realVulns = await realClient.getVulns()
  const mockVulns = await mockClient.getVulns()

  // Validate fields match
  assert.hasAllKeys(mockVulns, realVulns)
  assert.hasAllKeys(mockVulns[0], realVulns[0])
}
```

---

## Phase 5: Performance Benchmarks

### Metrics

| Metric | Target |
|--------|--------|
| Connector initialization | < 100ms |
| Single API call latency | < 500ms |
| Bulk data fetch (1000 items) | < 5s |
| Circuit breaker activation | < 50ms |
| Cache hit response | < 10ms |

### Implementation

```typescript
// benchmarks/performance.ts
import { benchmark } from 'hyperfine'

benchmark('Qualys getCriticalVulnerabilities', async () => {
  await qualys.getCriticalVulnerabilities()
}).measure()

benchmark('SentinelOne quarantineThreat', async () => {
  await sentinelone.quarantineThreat('threat-123')
}).measure()
```

---

## Phase 6: AI Adapter Tests

### Test Coverage

| Adapter | Tests |
|---------|-------|
| **MCP Server** | Tool registration, execution, manifest generation |
| **LangChain** | Tool creation, agent integration |
| **Vercel AI** | Tool set generation, function calling |
| **OpenAI Agents** | Agent definition, tool execution |
| **Google ADK** | Vertex AI function format conversion |

### Example

```typescript
// ai-tests/test-mcp.ts
import { MCPServer, createQualysMCPTools } from '../../src'

const mcp = new MCPServer({ name: 'test-mcp' })
mcp.registerConnectorTools('qualys', createQualysMCPTools(qualys))

// Test tool execution
const result = await mcp.executeTool('qualys_get_vulnerabilities', {})
assert(result.success === true)
```

---

## Phase 7: Demo Scripts

### Demo Files

| Script | Description |
|--------|-------------|
| `examples/demo-basic.ts` | Basic connector usage |
| `examples/demo-ai-agent.ts` | AI agent integration |
| `examples/demo-workflow.ts` | Automated workflows |
| `examples/demo-hitl.ts` | Human-in-the-loop |
| `examples/demo-resilience.ts` | Error handling |

### Running Demos

```bash
npm run demo:qualys
npm run demo:sentinelone
npm run demo:ai-agent
npm run demo:workflow
npm run demo:hitl
```

---

## Phase 8: Interactive Evaluation CLI

### Features

- Select connectors to test
- Run predefined queries
- View formatted results
- Test AI agent tools
- Generate evaluation report

### Implementation

```bash
# Interactive mode
npm run evaluate

# Guided evaluation
npm run evaluate -- --connector=qualys --test=critical-vulns

# Export results
npm run evaluate -- --export=json --output=results.json
```

---

## Phase 9: CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: SDK Evaluation Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: npm run setup-mocks
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:ai-adapters
      - run: npm run benchmark
```

---

## Phase 10: Environment Switching

### Mock vs Real API

```typescript
// scripts/switch-env.ts
export function setEnvironment(mode: 'mock' | 'real') {
  if (mode === 'mock') {
    process.env.QUALYS_BASE_URL = 'http://localhost:3000'
    process.env.SENTINELONE_BASE_URL = 'http://localhost:3001'
  } else {
    process.env.QUALYS_BASE_URL = process.env.REAL_QUALYS_URL
    process.env.SENTINELONE_BASE_URL = process.env.REAL_SENTINELONE_URL
  }
}
```

### Usage

```bash
# Use mocks
npm run setup -- --mode=mock

# Use real APIs
npm run setup -- --mode=real
```

---

## Quick Start for Users

```bash
# Clone and install
git clone https://github.com/skill-mine/complyment-connectors-sdk
cd complyment-connectors-sdk
npm install

# Setup test environment
npm run setup-mocks

# Run specific demo
npm run demo:qualys

# Run all tests
npm run test

# Interactive evaluation
npm run evaluate

# Performance benchmarks
npm run benchmark
```

---

## Success Criteria

| Criteria | Metric |
|----------|--------|
| Setup time | < 5 minutes |
| Demo execution | All demos pass |
| Error simulation | All error types tested |
| AI adapters | Framework integration verified |
| Performance | All metrics within targets |
| Documentation | Clear, actionable |

---

## Maintenance

- Update fixtures when APIs change
- Add new connector mocks as needed
- Keep benchmarks current
- Review and update demos quarterly

---

## Conclusion

This production-ready test environment enables users to thoroughly evaluate the SDK's capabilities, performance, and limitations before committing to integration.