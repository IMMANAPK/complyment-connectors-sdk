# @skill-mine/complyment-connectors-sdk

> Enterprise Security Tool Connectors SDK — built at Skill-Mine Technology

A TypeScript SDK that abstracts 8+ enterprise security tool integrations with built-in AI agent compatibility, circuit breakers, rate limiting, and human-in-the-loop controls.

[![npm version](https://img.shields.io/badge/npm-0.3.4-blue)](https://www.npmjs.com/package/@skill-mine/complyment-connectors-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![License](https://img.shields.io/badge/license-ISC-green)](#)

---

## Features

- **8 Connectors** — Qualys, SentinelOne, Check Point, ManageEngine, Jira, Zoho, Tenable.io, Tenable.sc
- **AI Agent Ready** — MCP, LangChain, Vercel AI SDK, OpenAI Agents SDK, Google ADK
- **Resilience** — Circuit breaker, retry with backoff, rate limiting, caching
- **Observability** — OpenTelemetry tracing, structured logging, audit logs
- **Security** — Human-in-the-loop approvals for critical actions
- **Normalization** — Unified vulnerability, asset, threat schemas across connectors
- **Semantic Search** — TF-IDF based natural language queries on security data
- **Dual Build** — ESM + CJS, full TypeScript declarations

---

## Installation
```bash
npm install @skill-mine/complyment-connectors-sdk
```

---

## Quick Start
```typescript
import {
  QualysConnector,
  SentinelOneConnector,
  JiraConnector,
  registry,
} from '@skill-mine/complyment-connectors-sdk'

// Initialize connectors
const qualys = new QualysConnector({
  baseUrl: 'https://qualysapi.qualys.com',
  username: process.env.QUALYS_USERNAME!,
  password: process.env.QUALYS_PASSWORD!,
})

// Register globally
registry.register('qualys', qualys)

// Fetch critical vulnerabilities
const vulns = await qualys.getCriticalVulnerabilities()
console.log(vulns.data)
```

---

## Playground

A built-in web UI for testing any connector against real credentials — no code required.

```bash
npm run playground        # build + start
npm run playground:start  # start without rebuilding
```

Open **http://localhost:4000** in your browser.

### Connector Playground

Select a connector from the sidebar, enter your credentials, pick an operation, edit params, and run it. Results are displayed as syntax-highlighted JSON with timing info.

All credentials are saved to `localStorage` — you only enter them once.

### AI Playground

Ask a question in plain English. The AI picks the right SDK operation, executes it against your real connector, and returns a plain-English summary of the findings.

- Supports **OpenAI** (`gpt-4o-mini`) and **Anthropic** (`claude-haiku-4-5`)
- Enter your API key once — saved to `localStorage` per provider
- Shows which operation the AI chose and what params it used
- Raw JSON result available alongside the summary

**Example queries:**
> "Show me the 10 most critical vulnerabilities"
> "Which endpoints have active threats right now?"
> "List all open security issues in Jira"

### Adding a new connector to the Playground

Edit `playground/connectors.registry.cjs` — add a single entry with connector metadata. Ops are **auto-discovered** from the SDK class at startup; no op lists to maintain.

```js
// playground/connectors.registry.cjs
module.exports = {
  myconnector: {
    sdkClass: 'MyConnector',          // exact export name from dist/index.js
    label:    'My Connector',
    desc:     'What it does',
    color:    '#4caf50',
    fields: [
      { key: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'https://...', required: true },
      { key: 'apiKey',  label: 'API Key',  type: 'password', placeholder: '••••',    required: true },
    ],
    // opsConfig is optional — only needed for custom default params or positional args
    opsConfig: {
      getThings: { params: { page: 1, limit: 10 } },
      deleteById: { args: ['id'], params: { id: '' } },
    },
  },
}
```

Restart the server — every public method on `MyConnector` appears automatically.

---

## Connectors

### Qualys
```typescript
const qualys = new QualysConnector({ ...config })

await qualys.getAssets({ hostname: 'web-server-01' })
await qualys.getCriticalVulnerabilities()
await qualys.launchScan('Weekly Scan', ['203.0.113.10'], '12345')
await qualys.getNormalizedVulnerabilities()
```

### SentinelOne
```typescript
const s1 = new SentinelOneConnector({ ...config })

await s1.getThreats({ severity: 'critical', status: 'active' })
await s1.quarantineThreat('threat-id-123')
await s1.killThreat('threat-id-123')
await s1.getInfectedAgents()
```

### Checkpoint
```typescript
const checkpoint = new CheckpointConnector({ ...config })

await checkpoint.getPolicies()
await checkpoint.addRule({ layer: 'Network', position: 'top', action: 'Drop' })
await checkpoint.blockThreat('threat-id')
await checkpoint.installPolicy({ policyPackage: 'Standard', targets: ['gateway-1'] })
```

### ManageEngine
```typescript
const me = new ManageEngineConnector({ ...config })

await me.getMissingPatches()
await me.getCriticalPatches()
await me.createDeployment({ patchIds: ['patch-1'], computerIds: ['pc-1'] })
```

### Jira
```typescript
const jira = new JiraConnector({ ...config })

await jira.getIssues({ projectKey: 'SEC', status: 'Open' })
await jira.createSecurityTicket('SEC', 'Critical CVE Found', 'Details...', 'critical', 'qualys')
await jira.transitionIssue('SEC-123', 'transition-id')
```

### Zoho CRM
```typescript
const zoho = new ZohoConnector({ ...config })

await zoho.getContacts()
await zoho.createLead({ lastName: 'Doe', company: 'Acme', email: 'doe@acme.com' })
await zoho.getDeals({ stage: 'Qualification' })
```

### Tenable.io (Cloud)
```typescript
import { TenableIoConnector } from '@skill-mine/complyment-connectors-sdk'

const tenableIo = new TenableIoConnector({
  accessKey: process.env.TENABLE_IO_ACCESS_KEY!,
  secretKey: process.env.TENABLE_IO_SECRET_KEY!,
})

// Assets & Vulnerabilities
await tenableIo.getAssets()
await tenableIo.exportVulnerabilitiesComplete({ severity: ['critical', 'high'] })

// Scans
await tenableIo.getScans()
await tenableIo.launchScan('scan-id')
await tenableIo.pauseScan('scan-id')

// Workbench (Quick Queries)
await tenableIo.getWorkbenchVulnerabilities({ date_range: 30 })
await tenableIo.getWorkbenchAssets()

// Statistics
await tenableIo.getStats()
```

### Tenable.sc (On-Premises)
```typescript
import { TenableScConnector } from '@skill-mine/complyment-connectors-sdk'

const tenableSc = new TenableScConnector({
  baseUrl: process.env.TENABLE_SC_BASE_URL!,
  accessKey: process.env.TENABLE_SC_ACCESS_KEY!,
  secretKey: process.env.TENABLE_SC_SECRET_KEY!,
})

// Assets & Vulnerabilities
await tenableSc.getAssets()
await tenableSc.getVulnerabilities({ severity: '4' }) // Critical
await tenableSc.getCriticalVulnerabilities()

// Policies & Users
await tenableSc.getPolicies()
await tenableSc.getUsers()
await tenableSc.createUser({ username: 'analyst', role: { id: 4 } })

// Scans & Results
await tenableSc.getScans()
await tenableSc.getScanResults()

// Statistics
await tenableSc.getStats()
```

---

## AI Agent Integration

### MCP (Model Context Protocol)
```typescript
import { MCPServer, createQualysMCPTools } from '@skill-mine/complyment-connectors-sdk'

const mcp = new MCPServer({ name: 'security-mcp' })

mcp.registerConnectorTools('qualys', createQualysMCPTools(qualys))

// Expose to AI agents
const manifest = mcp.generateManifest()
const result = await mcp.executeTool('qualys_get_critical_vulnerabilities', {})
```

### LangChain
```typescript
import { LangChainAdapter } from '@skill-mine/complyment-connectors-sdk'

const tools = LangChainAdapter.createAllTools({ qualys, sentinelone, jira })

// Use with LangChain agent
const agent = createReactAgent({ llm, tools })
```

### Vercel AI SDK
```typescript
import { VercelAIAdapter } from '@skill-mine/complyment-connectors-sdk'

const tools = VercelAIAdapter.createFullToolSet({ qualys, sentinelone, jira })

const result = await generateText({
  model: openai('gpt-4o'),
  tools,
  prompt: 'What critical vulnerabilities need immediate attention?',
})
```

### OpenAI Agents SDK
```typescript
import { OpenAIAgentsAdapter } from '@skill-mine/complyment-connectors-sdk'

const agent = OpenAIAgentsAdapter.createSecurityAnalystAgent({
  qualys, sentinelone, jira,
})

// agent.tools ready for OpenAI Agents SDK
```

### Google ADK (Gemini / Vertex AI)
```typescript
import { GoogleADKAdapter } from '@skill-mine/complyment-connectors-sdk'

// Pre-built security analyst agent config for Google ADK
const agentConfig = GoogleADKAdapter.createSecurityAnalystAgent({
  qualys, sentinelone, jira,
})
// agentConfig.tools ready for Google Agent Development Kit

// Or build a full tool set from all connectors
const tools = GoogleADKAdapter.createFullToolSet({ qualys, sentinelone, checkpoint, jira })

// Convert to Vertex AI function calling format
const vertexFunctions = GoogleADKAdapter.toVertexAIFunction(tools)
```

---

## Human-in-the-Loop (HITL)
```typescript
import { HITLManager } from '@skill-mine/complyment-connectors-sdk'

const hitl = new HITLManager({
  autoApproveRiskLevels: ['low'],
  onApprovalRequired: (req) => {
    // Send Slack/email notification to security team
    notifyTeam(req)
  },
})

hitl.registerHandler('threat.quarantine', async ({ threatId }) => {
  return s1.quarantineThreat(threatId as string)
})

// AI agent requests approval
const request = await hitl.requestApproval({
  actionType: 'threat.quarantine',
  connector: 'sentinelone',
  description: 'Quarantine ransomware on DESKTOP-XYZ',
  riskLevel: 'high',
  params: { threatId: 'threat-123' },
  requestedBy: 'SecurityAgent',
})

// Human approves via dashboard
await hitl.approve(request.id, 'john.doe@skill-mine.com')
```

---

## Resilience Features

### Circuit Breaker
```typescript
// Built into BaseConnector - automatic
// Opens after 5 failures, recovers after 60s
const qualys = new QualysConnector({
  ...config,
  // Circuit breaker opens automatically after repeated request failures.
})
```

### Rate Limiting
```typescript
const qualys = new QualysConnector({
  ...config,
  rateLimit: {
    requests: 100,
    perSeconds: 60,
  },
})
```

### Retry with Backoff
```typescript
const qualys = new QualysConnector({
  ...config,
  retries: 3,
})
```

### Caching
```typescript
const qualys = new QualysConnector({
  ...config,
  cache: {
    enabled: true,
    ttl: 300, // 5 minutes
  },
})
```

---

## Normalization
```typescript
import { normalizationEngine } from '@skill-mine/complyment-connectors-sdk'

// Normalize across multiple connectors
const result = normalizationEngine.normalizeVulnerabilities([
  { connector: 'qualys', data: qualysVulns, mapper: qualysMapper },
  { connector: 'sentinelone', data: s1Threats, mapper: s1Mapper },
])

// Deduplicated by CVE, highest severity wins
console.log(result.data)    // NormalizedVulnerability[]
console.log(result.sources) // ['qualys', 'sentinelone']

// Severity stats
const stats = normalizationEngine.getSeverityStats(result.data)
// { critical: 3, high: 7, medium: 12, low: 5, info: 2 }
```

---

## Semantic Search
```typescript
import { semanticSearch } from '@skill-mine/complyment-connectors-sdk'

// Index connector data
semanticSearch.indexVulnerabilities(qualysVulns)
semanticSearch.indexThreats(s1Threats)
semanticSearch.indexAssets(qualysAssets)

// Natural language queries
const results = await semanticSearch.search('critical ransomware on windows server')
const threats = await semanticSearch.findCriticalThreats()
const vulns = await semanticSearch.findVulnerableAssets('web-server-01')
```

---

## Audit Logging
```typescript
import { auditLogger } from '@skill-mine/complyment-connectors-sdk'

auditLogger.logSuccess('data.fetch', 'qualys', { count: 42 }, 320)
auditLogger.logFailure('auth.login', 'sentinelone', 'Invalid token')

const stats = auditLogger.getStats('qualys')
// { total: 100, success: 95, failure: 5, successRate: '95.00%' }

// Export for compliance
const csv = auditLogger.exportAsCsv()
const json = auditLogger.exportAsJson()
```

---

## Environment Variables
```bash
# Qualys
COMPLYMENT_QUALYS_BASE_URL=https://qualysapi.qualys.com
COMPLYMENT_QUALYS_USERNAME=your_username
COMPLYMENT_QUALYS_PASSWORD=your_password

# SentinelOne
COMPLYMENT_SENTINELONE_BASE_URL=https://your-instance.sentinelone.net
COMPLYMENT_SENTINELONE_API_TOKEN=your_api_token

# Jira
COMPLYMENT_JIRA_BASE_URL=https://your-org.atlassian.net
COMPLYMENT_JIRA_EMAIL=your@email.com
COMPLYMENT_JIRA_API_TOKEN=your_api_token

# ManageEngine
COMPLYMENT_MANAGEENGINE_BASE_URL=https://your-manageengine
COMPLYMENT_MANAGEENGINE_CLIENT_ID=your_client_id
COMPLYMENT_MANAGEENGINE_CLIENT_SECRET=your_client_secret
COMPLYMENT_MANAGEENGINE_REFRESH_TOKEN=your_refresh_token

# Tenable.io (Cloud)
TENABLE_IO_ACCESS_KEY=your_access_key
TENABLE_IO_SECRET_KEY=your_secret_key

# Tenable.sc (On-Premises)
TENABLE_SC_BASE_URL=https://your-tenable-sc-server
TENABLE_SC_ACCESS_KEY=your_access_key
TENABLE_SC_SECRET_KEY=your_secret_key
```

---

## Built Output
```
dist/
├── index.js      262 KB  (CJS - Node.js)
├── index.mjs     255 KB  (ESM - Bundlers)
├── index.d.ts    128 KB  (TypeScript)
└── index.d.mts   128 KB  (TypeScript ESM)
```

---

## Architecture
```
@skill-mine/complyment-connectors-sdk
├── Connectors        (Qualys, SentinelOne, Checkpoint, ManageEngine, Jira, Zoho, Tenable.io, Tenable.sc)
├── Core              (BaseConnector, Registry, Types, Errors)
├── Middleware        (CircuitBreaker, RateLimiter, RetryHandler, CacheLayer)
├── Telemetry         (Logger, OpenTelemetry Tracer)
├── Normalization     (Cross-connector unified schemas)
├── Audit             (Compliance audit logging)
├── Streaming         (Paginated streaming, real-time polling)
├── Secrets           (Vault + Env based credential management)
├── Webhook           (Inbound webhook processing with HMAC verification)
└── AI
    ├── MCP           (Model Context Protocol server)
    ├── LangChain     (LangChain tool adapters)
    ├── Vercel AI     (Vercel AI SDK tool adapters)
    ├── OpenAI Agents (OpenAI Agents SDK adapters)
    ├── Google ADK    (Google Agent Development Kit / Vertex AI adapters)
    ├── HITL          (Human-in-the-loop approval system)
    ├── Orchestration (Multi-agent workflow orchestration)
    ├── Semantic      (TF-IDF semantic search on security data)
    └── Workflows     (Pre-built security automation workflows)
```

---

## Tech Stack

- **TypeScript 5.x** strict mode
- **tsup** — ESM + CJS dual build
- **axios** — HTTP client
- **zod** — Runtime schema validation

---

## Quality Checks
```bash
npm run typecheck
npm test
npm run test:bench
npm run eval:quick
npm run pack:dry

# Run the full local gate
npm run verify
```

---

## E2E Testing (Playwright)

Real browser tests that run against live connector APIs — no mocks.

### Setup

Copy the credentials template and fill in your keys:

```bash
cp .env.e2e.example .env.e2e
# edit .env.e2e with real credentials
```

Env var naming convention — `CONNECTORID_FIELD_KEY` in UPPER_SNAKE_CASE:

```bash
# Jira (only 3 vars needed — projectKey and boardId are auto-discovered)
JIRA_BASE_URL=https://your-org.atlassian.net
JIRA_EMAIL=your@email.com
JIRA_API_TOKEN=your_api_token

# Qualys
QUALYS_BASE_URL=https://qualysapi.qualys.com
QUALYS_USERNAME=your_username
QUALYS_PASSWORD=your_password

# Tenable.io
TENABLE_IO_ACCESS_KEY=your_access_key
TENABLE_IO_SECRET_KEY=your_secret_key
```

### Test commands

```bash
# Run all e2e tests (all connectors with credentials found in .env.e2e)
npm run test:e2e

# Generic read-only tests auto-generated for every connector in the registry
npm run test:connectors

# Full API suite for a specific connector (e.g. Jira — 18 operations end-to-end)
npm run test:full -- "Jira"

# Open Playwright UI (interactive test runner)
npm run test:e2e:ui
```

### How it works

- **One spec per connector is not needed** — `connectors.spec.ts` generates tests dynamically from `playground/connectors.registry.cjs`. Adding a new connector to the registry gives it tests automatically.
- **Headed browser with visual cursor** — tests run in a real Chromium window with an orange cursor indicator and click flash animation so you can watch interactions happen.
- **Auto-discovery** — the Jira suite discovers `projectKey` and `boardId` from the API at startup; no extra env vars required.
- **Scalable** — the same two test files cover every connector, no matter how many are added.

### Full Jira suite (18 operations)

The `jira-full.spec.ts` suite covers every Jira operation end-to-end in sequence:

| # | Operation | Description |
|---|---|---|
| 01 | `testConnection` | Verify credentials |
| 02 | `getProjects` | List all projects |
| 03 | `getProjectByKey` | Fetch auto-discovered project |
| 04 | `getIssues` | Search issues by project |
| 05 | `createIssue` | Create a test issue |
| 06 | `getIssueByKey` | Read the created issue |
| 07 | `updateIssue` | Update summary + priority |
| 08 | `addComment` | Add a comment |
| 09 | `getComments` | Read comments |
| 10 | `getTransitions` | List available transitions |
| 11 | `transitionIssue` | Change issue status |
| 12 | `bulkCreateIssues` | Create 2 issues in one call |
| 13 | `createSecurityTicket` | Create security-labelled ticket |
| 14 | `getSprints` | List board sprints |
| 15 | `getActiveSprint` | Get current active sprint |
| 16–18 | `deleteIssue` | Cleanup all created issues |

---

## Author

**Immanuvel** — Backend Developer, Skill-Mine Technology Consulting
Built as internal tooling for the Complyment compliance platform serving 50+ enterprise clients.

---

## License

ISC
