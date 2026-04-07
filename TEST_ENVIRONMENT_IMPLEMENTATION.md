# SDK Evaluation Environment - Implementation Guide

## Overview

This document provides a complete implementation guide for the production-ready SDK evaluation environment. The system enables users to test the Complyment Connectors SDK without real API credentials.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                     SDK Evaluation Environment                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   CLI Tools  │    │  Mock Server │    │  Fixtures   │      │
│  │  (evaluate)  │───▶│  (Express)   │◀───│  (JSON)     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                    │               │
│         ▼                   ▼                    ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Environment  │    │    Error     │    │   Schema     │      │
│  │   Manager    │    │  Injection   │    │ Validation   │      │
│  │ (mock/real)  │    │  (zod)       │    │   (Zod)      │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                    │               │
│         ▼                   ▼                    ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Benchmarking │    │ AI Adapter  │    │Observability │      │
│  │  (perf)      │    │   Tests     │    │ (logs/trace) │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
complyment-connectors-sdk/
├── test-env/                      # Evaluation environment
│   ├── mocks/
│   │   ├── errors/
│   │   │   └── index.ts           # Error injection system
│   │   └── connectors/            # Connector-specific mocks
│   ├── fixtures/                  # Test data
│   │   ├── qualys/
│   │   │   ├── vulnerabilities.json
│   │   │   ├── critical-vulnerabilities.json
│   │   │   ├── empty-results.json
│   │   │   └── malformed.json
│   │   ├── sentinelone/
│   │   ├── jira/
│   │   └── tenable-io/
│   ├── server/
│   │   └── mockServer.ts          # Express mock server
│   ├── utils/
│   │   ├── types.ts               # Type definitions
│   │   ├── envManager.ts          # Environment switching
│   │   ├── validation.ts          # Zod schemas
│   │   └── observability.ts       # Logging/tracing
│   └── errors/                    # Error scenarios
├── tests/
│   ├── unit/                      # Unit tests
│   ├── integration/               # Integration tests
│   ├── mock/                      # Mock tests
│   ├── benchmarks/
│   │   └── performance.ts         # Performance benchmarks
│   └── ai/
│       └── test-adapters.ts       # AI adapter tests
├── bin/
│   ├── setup.ts                   # One-command setup
│   ├── evaluate.ts                # Interactive CLI
│   └── switch-env.ts              # Environment switcher
├── examples/
│   ├── demo-quick.ts              # Quick demo (one command)
│   ├── demo-connector.ts          # Per-connector demo
│   └── demo-ai.ts                 # AI adapter demo
└── .github/
    └── workflows/
        └── test-evaluation.yml    # CI/CD pipeline
```

---

## Phase Implementation

### Phase 1: Core Foundation (Week 1)

**Goal**: Enable users to test within 1-2 minutes

| Task | Description | Deliverable |
|------|-------------|--------------|
| Mock Server | Express server with basic endpoints | `test-env/server/mockServer.ts` |
| Fixtures | JSON test data (happy path) | `test-env/fixtures/qualys/vulnerabilities.json` |
| Environment Manager | Switch between mock/real | `test-env/utils/envManager.ts` |
| One-Command Demo | `npm run demo` | `examples/demo-quick.ts` |

**Key Files**:
- `test-env/server/mockServer.ts` - Mock HTTP server
- `test-env/utils/envManager.ts` - Environment switching
- `examples/demo-quick.ts` - Quick start demo

### Phase 2: Error Handling & Validation (Week 2)

**Goal**: Test SDK resilience features

| Task | Description | Deliverable |
|------|-------------|--------------|
| Error Injection | Simulate rate limits, timeouts, auth failures | `test-env/mocks/errors/index.ts` |
| Schema Validation | Zod schemas for response validation | `test-env/utils/validation.ts` |
| Edge Case Fixtures | Empty results, malformed data | `test-env/fixtures/qualys/empty-results.json` |
| Circuit Breaker Tests | Test resilience features | `tests/unit/circuit-breaker.ts` |

**Error Types**:
```typescript
type ErrorType = 'rate_limit' | 'timeout' | 'auth_failure' | 'server_error' | 'connection_refused'
```

**Usage**:
```bash
# Test with random errors
MOCK_ERROR_PROBABILITY=0.1 npm run demo

# Test specific error
MOCK_ERROR=rate_limit npm run demo
```

### Phase 3: Performance & AI Adapters (Week 3)

**Goal**: Benchmark and test AI integration

| Task | Description | Deliverable |
|------|-------------|--------------|
| Performance Benchmarks | Latency, throughput metrics | `tests/benchmarks/performance.ts` |
| MCP Server Tests | Test MCP tool registration/execution | `tests/ai/test-adapters.ts` |
| LangChain Tests | Verify tool adapter works | `tests/ai/langchain.ts` |
| Interactive CLI | Guided evaluation tool | `bin/evaluate.ts` |

**Benchmark Metrics**:
- Connector initialization: < 100ms
- Single API call: < 500ms
- 1000 items bulk fetch: < 5s
- Cache hit: < 10ms

---

## Common Mistakes & How to Avoid Them

### 1. Over-Engineering the Mock Server

**Mistake**: Building a full API simulator with complex state management

**Solution**: Start simple, add complexity only when needed

```typescript
// ❌ Too complex
class MockServer {
  private state: Map<string, Map<string, unknown>> = new Map()
  private transactions: Transaction[] = []
  // ... 500 more lines
}

// ✅ Simple and effective
const mockResponses: Record<string, unknown> = {
  'qualys_vulns': { data: [...] },
}
```

### 2. Not Providing Realistic Error Scenarios

**Mistake**: Only testing happy paths

**Solution**: Include error injection that mimics real API behavior

```typescript
// ✅ Realistic errors
const ERROR_SCENARIOS = {
  rate_limit: { statusCode: 429, headers: { 'Retry-After': '60' } },
  auth_failure: { statusCode: 401, headers: { 'WWW-Authenticate': 'Bearer' } },
}
```

### 3. Missing Schema Validation

**Mistake**: Comparing response shapes directly

**Solution**: Use Zod for runtime validation

```typescript
// ✅ With Zod validation
const result = VulnerabilitySchema.safeParse(data)
if (!result.success) {
  console.log('Validation errors:', result.error.issues)
}
```

### 4. Inadequate Fixture Coverage

**Mistake**: Only providing happy path data

**Solution**: Include all fixture types

```
fixtures/
├── happy_path/        # Normal responses
├── edge_cases/       # Empty, max size, pagination
├── malformed/        # Wrong types, missing fields
└── large_data/       # Performance testing
```

### 5. Poor Developer Experience

**Mistake**: Requiring multiple commands to get started

**Solution**: Provide one-command quick start

```bash
# ✅ One command to evaluate
npm run demo

# ✅ Guided interactive evaluation
npm run eval

# ✅ Test specific connector
npm run demo:qualys
```

### 6. Not Tracking Request IDs

**Solution**: Add observability from day one

```typescript
const context = createRequestContext('qualys', 'getVulns')
// Every log includes requestId, latencyMs
logInfo('Fetching vulnerabilities', context)
```

### 7. Ignoring Environment Switching

**Mistake**: Hardcoding mock URLs

**Solution**: Build environment manager

```typescript
// ✅ Environment-aware
const baseUrl = isMockMode() 
  ? 'http://localhost:3100' 
  : process.env.REAL_API_URL
```

---

## Quick Start Commands

```bash
# Installation
npm install

# One-command demo (recommended for new users)
npm run demo

# Interactive evaluation
npm run eval

# Test specific connector
npm run demo:qualys
npm run demo:sentinelone

# Test AI adapters
npm run test:ai

# Performance benchmarks
npm run test:bench

# Run in real API mode
npm run setup -- --mode=real
```

---

## Environment Variables

```bash
# Environment
COMPLYMENT_ENV_MODE=mock|real

# Mock Server
MOCK_SERVER_PORT=3100
MOCK_ERROR_PROBABILITY=0.1
MOCK_RESPONSE_DELAY=50

# Real API Endpoints (when mode=real)
COMPLYMENT_QUALYS_BASE_URL=https://qualysapi.qualys.com
COMPLYMENT_SENTINELONE_BASE_URL=https://your-instance.sentinelone.net
COMPLYMENT_JIRA_BASE_URL=https://your-org.atlassian.net
```

---

## Validation Schema Examples

```typescript
// Qualys Vulnerability
const VulnerabilitySchema = z.object({
  id: z.string(),
  qid: z.number(),
  title: z.string(),
  severity: z.number().min(1).max(5),
  cvss: z.number().min(0).max(10),
})

// Validate single item
const result = VulnerabilitySchema.safeParse(data)

// Validate batch
const { valid, invalid } = validateBatch(VulnerabilitySchema, items)
```

---

## Versioning Strategy

### SDK Versioning
- Follow Semantic Versioning (semver)
- Major: Breaking changes to API
- Minor: New features, backward compatible
- Patch: Bug fixes

### API Mock Versioning
- Match connector API versions
- Version in URL: `/api/v1/qualys/vulns`
- Support multiple versions simultaneously

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to first test | < 2 minutes |
| Demo execution success | 100% |
| Error injection coverage | 5 error types |
| Fixture coverage | 4 types per connector |
| Schema validation | 100% response coverage |
| Benchmark automation | All key metrics |
| AI adapter tests | All 5 frameworks |

---

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/test-evaluation.yml`) runs:
1. Mock server startup
2. All connector demos
3. AI adapter tests
4. Performance benchmarks
5. Schema validation
6. Lint and build

---

## Maintenance

- **Monthly**: Update fixtures with real API changes
- **Quarterly**: Review and update benchmarks
- **Ongoing**: Add new connector mocks as SDK grows

---

## Conclusion

This test environment provides a production-ready, developer-friendly way to evaluate the Complyment Connectors SDK. Focus on:
1. **Speed** - Users should test within 2 minutes
2. **Simplicity** - One command to get started
3. **Realism** - Errors and responses close to production
4. **Observability** - Request IDs, latency tracking
5. **Scalability** - Easy to add new connectors and tests