# Connector Generator — Feature Plan

> Auto-generate and update SDK connectors from uploaded API documents using AI, with full human-in-the-loop control, CLI + Web UI + MCP interfaces.

---

## Table of Contents

1. [Overview](#overview)
2. [Full Pipeline Flow](#full-pipeline-flow)
3. [Step-by-Step Detail](#step-by-step-detail)
4. [Multi-Provider AI](#multi-provider-ai)
5. [Document Input Support](#document-input-support)
6. [Human Interaction (HITL)](#human-interaction-hitl)
7. [CLI Interface](#cli-interface)
8. [Web UI Interface](#web-ui-interface)
9. [MCP Interface](#mcp-interface)
10. [Git & Branch Management](#git--branch-management)
11. [Code Generation & Update](#code-generation--update)
12. [Playwright Test Loop](#playwright-test-loop)
13. [Automated Code Review](#automated-code-review)
14. [GitHub MR Creation](#github-mr-creation)
15. [Notifications](#notifications)
16. [Configuration](#configuration)
17. [File Structure](#file-structure)
18. [Dependencies](#dependencies)
19. [npm Scripts](#npm-scripts)

---

## Overview

A developer uploads any API documentation (PDF, OpenAPI spec, Markdown, plain text) or provides a public docs URL such as a published Notion page. The generator:

1. Validates the document is a real API spec
2. Detects whether this is a new connector or an update to an existing one
3. Manages git branching automatically
4. Uses AI to generate or surgically update all connector files
5. Runs Playwright tests and fixes failures
6. Performs automated code review
7. Creates a GitHub Pull Request with a full report
8. Notifies the assigned person by email

Human can interact, give instructions in plain English, approve or reject at every step — or run the whole pipeline fully automatically.

---

## Full Pipeline Flow

```
Upload Document or URL (PDF / OpenAPI / Markdown / HTML / Text / Notion)
        │
        ▼
┌─────────────────────────────────────────────────┐
│  STEP 1: DOCUMENT VALIDATION                    │
│  AI checks: is this a real API doc?             │
│  Output: connector name, auth type, operations  │
│  HITL gate: human reviews + approves            │
└──────────────────────┬──────────────────────────┘
                       │ APPROVED
                       ▼
┌─────────────────────────────────────────────────┐
│  STEP 2: BRANCH CHECK                           │
│  Does connector/{name} branch exist on GitHub?  │
│  YES → pull latest, detect conflicts            │
│  NO  → create new branch from main             │
│  HITL gate: human confirms branch action        │
└──────────────────────┬──────────────────────────┘
                       │ APPROVED
                       ▼
┌─────────────────────────────────────────────────┐
│  STEP 3: CONFLICT RESOLUTION (if needed)        │
│  AI reads conflict markers, resolves each file  │
│  Shows before/after diff per conflicted file    │
│  HITL gate: human reviews resolution            │
└──────────────────────┬──────────────────────────┘
                       │ APPROVED
                       ▼
┌─────────────────────────────────────────────────┐
│  STEP 4: CODE GENERATION / UPDATE               │
│  New connector → generates 5 files              │
│  Existing connector → diffs + surgical edits    │
│  Shows file previews / changelog                │
│  HITL gate: human reviews code, gives edits     │
└──────────────────────┬──────────────────────────┘
                       │ APPROVED
                       ▼
┌─────────────────────────────────────────────────┐
│  STEP 5: PLAYWRIGHT TESTS                       │
│  Runs connector test suite                      │
│  FAIL → AI proposes fix → human approves        │
│  Retry loop: max 3 attempts                     │
│  HITL gate: human sees results, approves        │
└──────────────────────┬──────────────────────────┘
                       │ APPROVED
                       ▼
┌─────────────────────────────────────────────────┐
│  STEP 6: CODE REVIEW                            │
│  AI reviews generated code                      │
│  Returns: score, issues, strengths, verdict     │
│  Human can auto-fix warnings or ignore          │
│  HITL gate: human approves before MR            │
└──────────────────────┬──────────────────────────┘
                       │ APPROVED
                       ▼
┌─────────────────────────────────────────────────┐
│  STEP 7: GITHUB MR CREATION                     │
│  Auto-generates PR title + full body            │
│  Includes: test results, review score, files    │
│  Human can edit title/desc before creating      │
│  HITL gate: final confirmation before push      │
└──────────────────────┬──────────────────────────┘
                       │ APPROVED
                       ▼
┌─────────────────────────────────────────────────┐
│  STEP 8: NOTIFICATION                           │
│  Sends to assigned person: Email                │
│  Preview shown before sending                   │
│  HITL gate: human confirms before sending       │
└──────────────────────┬──────────────────────────┘
                       │ SENT
                       ▼
                    DONE ✓
```

---

## Step-by-Step Detail

### Step 1 — Document Validation

AI reads the uploaded document and returns:

```json
{
  "isApiDocument": true,
  "connectorName": "CrowdStrike Falcon",
  "authType": "api_key",
  "authDetails": "X-CrowdStrike-API-Key header",
  "operationsFound": ["getIncidents", "getDevices", "getAlerts"],
  "baseUrl": "https://api.crowdstrike.com",
  "missingFields": [],
  "confidence": 92,
  "verdict": "PASS",
  "reason": "Valid REST API documentation with clear auth and 3+ operations"
}
```

| Verdict | Condition | Action |
|---|---|---|
| `PASS` | Auth + baseUrl + 2+ operations found | Proceed |
| `WARN` | Partial — missing auth or few operations | Ask human to confirm |
| `FAIL` | No API structure detected | Show what's missing, exit |
| `REJECT` | Not an API document at all | Exit with message |

---

### Step 2 — Branch Management

Branch naming convention: `connector/{connector-id}`

**Branch exists:**
```
git fetch origin connector/qualys
git checkout connector/qualys
git pull origin connector/qualys
→ detect conflicts → Step 3
```

**Branch does not exist:**
```
git checkout main
git pull origin main
git checkout -b connector/crowdstrike
```

---

### Step 3 — Conflict Resolution

AI reads conflict markers in each file and resolves them. Shows human:
- Which files had conflicts
- What AI chose and why
- Full before/after diff

Human can: accept, request different resolution, or resolve manually.

---

### Step 4 — Code Generation / Update

**CREATE mode** (new connector) — generates 5 files:

| File | Contents |
|---|---|
| `{Name}Connector.ts` | Class extending BaseConnector, one method per operation |
| `types.ts` | TypeScript interfaces for all API types |
| `constants.ts` | API paths, defaults, maps |
| `parser.ts` | Response parser stubs |
| `index.ts` | Export barrel |

Also patches:
- `src/index.ts` — adds export
- `playground/connectors.registry.cjs` — adds registry entry

**UPDATE mode** (existing connector) — surgical edits only:

AI diffs the new document against existing code and returns a changelog:

```json
{
  "changes": [
    { "type": "operation_changed", "name": "getAssets", "what": "path changed", "severity": "breaking" },
    { "type": "operation_added",   "name": "getPatchReport", "what": "new endpoint", "severity": "additive" },
    { "type": "type_added",        "name": "PatchReport", "what": "new type", "severity": "additive" }
  ],
  "summary": "1 breaking change, 2 additions"
}
```

Only the changed parts are rewritten. Custom code added manually by developers is preserved.

**Self-correction loop:**
```
AI generates code
       │
       ▼
npm run typecheck
       │
  ┌────┴────┐
PASS       FAIL
  │           │
done     Send errors to AI → fix → retry (max 2)
```

---

### Step 5 — Playwright Tests

```bash
npm run test:connectors -- --grep "ConnectorName"
```

**Failure fix loop:**
```
Test fails
    │
AI reads: test output + failing code
    │
AI rewrites the broken method
    │
Re-run tests (max 3 attempts)
    │
If still failing after 3 → flag in PR, do not block
```

Test spec file (`connectors.spec.ts`) is also updated if new operations were added.

---

### Step 6 — Automated Code Review

AI reviews final code and returns:

```json
{
  "score": 87,
  "issues": [
    { "severity": "warning", "file": "XConnector.ts", "line": 45, "message": "No rate limit handling" }
  ],
  "strengths": ["Follows BaseConnector contract", "All methods return ConnectorResponse<T>"],
  "verdict": "APPROVED_WITH_WARNINGS"
}
```

Checks performed:
- Follows `BaseConnector` contract
- All methods return `ConnectorResponse<T>`
- Auth handled through base class (no hardcoded secrets)
- Error handling present
- Constants properly extracted
- TypeScript types complete
- No OWASP top-10 issues

---

### Step 7 — GitHub MR Creation

PR body auto-generated:

```markdown
## New Connector: CrowdStrike Falcon

**Auth:** API Key
**Operations:** getIncidents, getDevices, getAlerts

## Test Results
✓ testConnection — passed
✓ getIncidents — passed
⚠ getAlerts — skipped (missing env var in CI)

## Code Review
Score: 87/100 | Status: APPROVED WITH WARNINGS

## Files Changed
- src/connectors/crowdstrike/CrowdStrikeConnector.ts (new)
- src/connectors/crowdstrike/types.ts (new)
- src/connectors/crowdstrike/constants.ts (new)
- src/connectors/crowdstrike/parser.ts (new)
- src/connectors/crowdstrike/index.ts (new)
- src/index.ts (updated)
- playground/connectors.registry.cjs (updated)

🤖 Auto-generated by complyment-connectors-sdk generator
```

---

### Step 8 — Notification

Channels: Email (nodemailer)

```
Subject: [Connector Ready] CrowdStrike Falcon — Review Required

Connector : CrowdStrike Falcon
Mode      : New connector
Branch    : connector/crowdstrike
PR        : github.com/IMMANAPK/complyment-connectors-sdk/pull/42

Tests     : 3 passed, 1 skipped
Score     : 87/100 (2 warnings)
Status    : Ready for review
```

---

## Multi-Provider AI

One `LLMProvider` interface — three implementations. Generator code never changes regardless of which AI is used.

```javascript
interface LLMProvider {
  name: string
  generate(systemPrompt: string, userPrompt: string): Promise<string>
}
```

**Auto-detection from environment:**

```
ANTHROPIC_API_KEY  →  Claude (claude-sonnet-4-6)
GEMINI_API_KEY     →  Gemini (gemini-1.5-pro)
OPENAI_API_KEY     →  OpenAI (gpt-4o)
```

First available key wins. User can force a provider:
```bash
npm run generate -- --file api.pdf --provider openai
```

**Two AI calls per pipeline run:**

| Call | Purpose | Cost |
|---|---|---|
| Analysis | Validate doc, detect connector name, auth, ops | Small |
| Generation | Generate all 5 files or surgical edits | Larger |

---

## Document Input Support

| Format | Library | Notes |
|---|---|---|
| PDF | `pdf-parse` | Vendor API docs |
| OpenAPI JSON | `JSON.parse` (built-in) | Swagger specs |
| OpenAPI YAML | `js-yaml` | Swagger specs |
| Markdown | `fs.readFileSync` (built-in) | API reference docs |
| HTML | `node-html-parser` | Scraped docs pages, including published Notion pages |
| Public URL | built-in `fetch` + content parser | Fetches HTML/JSON/YAML/text and routes to the matching extractor |
| Plain text | `fs.readFileSync` (built-in) | Description or notes |

Plain text example:
```bash
npm run generate -- --text "CrowdStrike Falcon, API key auth, needs getIncidents, getDevices"
```

---

## Human Interaction (HITL)

### Conversation at Every Gate

Every step is a mini-conversation — not just Y/N:

```
► What do you want to do? [y/n] or type instructions:
> add a getAlertsBySeverity method and use camelCase for all types

Applying your instructions...
✓ Added: getAlertsBySeverity()
✓ Types renamed to camelCase

► Happy with this? [y/n]:
> y
```

### Human Options at Every Gate

| Input | Action |
|---|---|
| `y` / `yes` / `proceed` | Approve, move to next step |
| `n` / `no` / `stop` | Stop pipeline, save state |
| `[any instruction]` | AI modifies current step, shows updated result |
| `[question]` | AI answers, gate stays open |
| `skip` | Skip this step |
| `view` / `show full` | Display full file content |
| `retry` | Re-run step from scratch |
| `resume` | Resume a saved pipeline |

### Instructions Carry Forward

If human gives an instruction that applies to a future step, AI stores and applies it later:

```
STEP 4: "make sure the PR title says [CONNECTOR] prefix"
→ AI stores this
→ STEP 7: PR title automatically uses "[CONNECTOR]" prefix
```

### State Saving — Resume Anytime

Pipeline saves state after every approved step:

```json
{
  "connectorId": "crowdstrike",
  "branch": "connector/crowdstrike",
  "lastCompletedStep": 4,
  "humanInstructions": [...]
}
```

Resume:
```bash
npm run generate -- --resume crowdstrike
```

---

## CLI Interface

Terminal-based. Uses `readline` for prompts, `chalk` for colors.

```
$ npm run generate -- --file ./crowdstrike.pdf

  Complyment Connector Generator
  ──────────────────────────────

  [1/8] Validating document...

  ✓ Document Analysis Complete
  ┌──────────────────────────────────┐
  │ Connector  : CrowdStrike Falcon  │
  │ Auth       : API Key             │
  │ Operations : 7 found             │
  │ Confidence : 92%                 │
  └──────────────────────────────────┘

  ► Proceed? [y/n] or type instructions:
  > y

  [2/8] Checking branch...
  ✓ Created: connector/crowdstrike

  [3/8] Generating code...
  ...
```

---

## Web UI Interface

Browser-based. Added as a new tab to the existing playground server. Runs on port `4001`.

```
npm run generate:ui
→ http://localhost:4001
```

### UI Layout

```
┌──────────────────────────────────────────────────────────┐
│  COMPLYMENT CONNECTOR GENERATOR                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────┐  ┌────────────────────────────────┐ │
│  │  PIPELINE STEPS │  │  STEP DETAIL                   │ │
│  │                 │  │                                │ │
│  │  1 ✓ Validate   │  │  Generated: CrowdStrikeConnector│ │
│  │  2 ✓ Branch     │  │                                │ │
│  │  3 ● Codegen    │  │  [Syntax-highlighted preview]  │ │
│  │  4 ○ Tests      │  │                                │ │
│  │  5 ○ Review     │  │  ┌── Your Instructions ──────┐ │ │
│  │  6 ○ MR         │  │  │ type anything here...     │ │ │
│  │  7 ○ Notify     │  │  └───────────────────────────┘ │ │
│  │                 │  │  [Approve ✓]  [Stop ✗]  [Edit] │ │
│  └─────────────────┘  └────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────┐                                     │
│  │  UPLOAD         │                                     │
│  │  Drag & drop    │                                     │
│  │  PDF/JSON/YAML  │                                     │
│  └─────────────────┘                                     │
└──────────────────────────────────────────────────────────┘
```

### UI Features

| Feature | Details |
|---|---|
| File upload | Drag & drop or file picker |
| Live step progress | Left sidebar updates in real time via WebSocket |
| Code preview | Syntax-highlighted with highlight.js |
| Diff viewer | Before/after for UPDATE mode |
| Chat-like input | Free-text instructions at each gate |
| Approve/Stop buttons | Visible action buttons at each gate |
| Config toggles | Toggle HITL on/off per step in browser |
| Test results table | Pass/fail/skip with error details |
| Code review panel | Score + warnings with file/line references |
| Resume | Load saved pipeline state |

### Real-time Communication

```
Browser                     Generator Server (WebSocket)
   │── upload file ─────────────────────────────────────►│
   │◄── step:start (validation) ────────────────────────│
   │◄── step:result ─────────────────────────────────── │
   │── human:approve ────────────────────────────────── ►│
   │◄── step:start (branch) ────────────────────────────│
   │── human:instruction ("add pagination") ────────── ►│
   │◄── step:updated ────────────────────────────────── │
   │── human:approve ────────────────────────────────── ►│
```

---

## MCP Interface

The generator is also exposed as an MCP server. Any MCP-compatible client (Claude Desktop, Cursor) can generate connectors conversationally.

### Setup (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "connector-generator": {
      "command": "node",
      "args": ["./src/ai/mcp/ConnectorGeneratorServer.js"]
    }
  }
}
```

### MCP Tools Exposed

| Tool | Purpose |
|---|---|
| `analyze_document` | Validate a file or text, return verdict |
| `generate_connector` | Full CREATE flow |
| `update_connector` | Full UPDATE flow |
| `list_connectors` | List all registered connectors |
| `get_connector_files` | Return existing connector source (used by AI during generation) |
| `run_typecheck` | Run tsc, return errors (used in self-correction) |
| `get_changelog` | Return pending changes before applying |

### MCP also used INSIDE generation

When AI is generating code, it gets MCP tools to call:
- `get_connector_files(id)` — reads existing files for context
- `list_connectors()` — avoids naming conflicts
- `run_typecheck(code)` — validates its own output before returning

---

## Git & Branch Management

| Scenario | Action |
|---|---|
| Branch does not exist | `git checkout main && git pull && git checkout -b connector/{id}` |
| Branch exists, no conflicts | `git checkout connector/{id} && git pull` |
| Branch exists, conflicts | Pull + AI conflict resolution + human approval |

Branch naming: `connector/{connector-id}`

Examples:
- `connector/qualys`
- `connector/crowdstrike`
- `connector/crowdstrike-v2` (if forced new branch)

---

## Configuration

### Config File: `.connector-gen.config.json`

```json
{
  "mode": "custom",
  "hitl": {
    "validation":      { "enabled": true,  "timeout": 60,  "allowInstructions": true  },
    "branchCheck":     { "enabled": false                                               },
    "conflictResolve": { "enabled": true,  "timeout": 120, "allowInstructions": true  },
    "codeGeneration":  { "enabled": true,  "timeout": 300, "allowInstructions": true  },
    "testFailureFix":  { "enabled": true,  "timeout": 120, "allowInstructions": false },
    "testResults":     { "enabled": false                                               },
    "codeReview":      { "enabled": true,  "timeout": 120, "allowInstructions": false },
    "mrCreation":      { "enabled": true,  "timeout": 60,  "allowInstructions": true  },
    "notification":    { "enabled": false                                               }
  },
  "autoApprove": {
    "onLowRisk": true,
    "confidenceThreshold": 90,
    "escalateOn": ["breakingChanges", "conflictsDetected", "testsFailed"]
  },
  "onTimeout": "auto-approve"
}
```

### Mode Options

| Mode | Behaviour |
|---|---|
| `interactive` | Human gate at every step (default) |
| `auto` | No human gates, fully automated |
| `custom` | Per-step config from `hitl` object |

### Timeout Options

| `onTimeout` value | Behaviour |
|---|---|
| `"auto-approve"` | Treat as human said Y when timer expires |
| `"auto-reject"` | Stop pipeline when timer expires |
| `"wait"` | Keep waiting indefinitely |

### Config Resolution Order

```
CLI flags  →  .connector-gen.config.json  →  built-in defaults
```

CLI flags always win. Built-in default is `mode: interactive`, all steps enabled.

### Environment Variables Required

```env
# AI — at least one required
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=

# GitHub — required for MR creation
GITHUB_TOKEN=

# Notifications — optional
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
NOTIFY_EMAIL=
```

---

## File Structure

```
src/codegen/
├── providers/
│   ├── index.cjs              ← auto-selects provider from env
│   ├── anthropic.cjs          ← Claude (claude-sonnet-4-6)
│   ├── gemini.cjs             ← Gemini (gemini-1.5-pro)
│   └── openai.cjs             ← OpenAI (gpt-4o)
│
├── extractors/
│   ├── pdf.cjs                ← pdf-parse
│   ├── openapi.cjs            ← js-yaml + JSON.parse
│   ├── html.cjs               ← node-html-parser
│   └── text.cjs               ← plain text / markdown
│
├── pipeline/
│   ├── orchestrator.cjs       ← runs all 8 steps in sequence
│   ├── event-bus.cjs          ← emits events → CLI or UI subscribes
│   └── state.cjs              ← save/resume pipeline state
│
├── hitl/
│   ├── gate-factory.cjs       ← returns CliGate / UiGate / NoOpGate
│   ├── CliGate.cjs            ← readline terminal prompts
│   ├── UiGate.cjs             ← WebSocket-based browser gate
│   ├── NoOpGate.cjs           ← auto-approves (auto mode)
│   ├── IntentClassifier.cjs   ← AI classifies human input
│   ├── ContextStore.cjs       ← carries instructions across steps
│   └── Prompter.cjs           ← terminal readline handler
│
├── config/
│   ├── config-loader.cjs      ← reads config file + CLI flags
│   ├── defaults.cjs           ← built-in default config
│   └── validator.cjs          ← validates config schema
│
├── git/
│   ├── branch-manager.cjs     ← check/create/pull/conflict-detect
│   └── pr-creator.cjs         ← gh pr create + body generation
│
├── analyzer.cjs               ← Step 1: document validation + verdict
├── differ.cjs                 ← Step 4 UPDATE: diff new doc vs existing code
├── changelog-display.cjs      ← pretty-print changelog to terminal/UI
├── prompt-builder.cjs         ← builds system + user prompts (shared)
├── output-parser.cjs          ← parse AI JSON response into files
├── file-writer.cjs            ← write 5 files (create) or surgical edit (update)
├── registry-patcher.cjs       ← patch index.ts + connectors.registry.cjs
├── test-runner.cjs            ← run playwright, parse results
├── test-fixer.cjs             ← AI fix loop on test failures
├── code-reviewer.cjs          ← AI code review + score
├── notifier.cjs               ← Email notification
├── self-corrector.cjs         ← typecheck retry loop
└── ai-generator.cjs           ← top-level orchestration

interfaces/
├── cli/
│   └── generate-connector.cjs ← CLI entry point (bin/)
└── ui/
    ├── generator-server.cjs   ← Express + WebSocket server (port 4001)
    └── public/
        ├── index.html
        ├── app.js             ← pipeline UI, WebSocket client
        └── styles.css

src/ai/mcp/
└── ConnectorGeneratorServer.ts ← MCP server (3rd interface)
```

---

## Dependencies

### New packages to install

```json
{
  "dependencies": {
    "@anthropic-ai/sdk":       "^0.30.0",
    "@google/generative-ai":   "^0.21.0",
    "openai":                  "^4.68.0",
    "pdf-parse":               "^1.1.1",
    "node-html-parser":        "^6.1.13",
    "simple-git":              "^3.27.0",
    "@octokit/rest":           "^21.0.0",
    "nodemailer":              "^6.9.0",
  }
}
```

### Already in project (verify before adding)

- `js-yaml` — OpenAPI YAML parsing
- `chalk` — terminal colors
- `express` — UI server (playground already uses it)
- `ws` — WebSocket (add if not present)

### Deliberately NOT used

| Skipped | Reason |
|---|---|
| LangChain | Overkill — only need `generate(prompt) → string` |
| Handlebars / templates | AI writes code directly, no templates |
| Commander.js / yargs | `process.argv` is enough for our flags |
| Vector DB / embeddings | Not needed for single-shot generation |

---

## npm Scripts

```json
{
  "generate":        "node bin/generate-connector.cjs",
  "generate:auto":   "node bin/generate-connector.cjs --mode auto",
  "generate:dry":    "node bin/generate-connector.cjs --dry-run",
  "generate:ui":     "node interfaces/ui/generator-server.cjs",
  "generate:dev":    "node interfaces/ui/generator-server.cjs --dev"
}
```

### Usage Examples

```bash
# CLI — from a PDF
npm run generate -- --file ./crowdstrike.pdf

# CLI — from OpenAPI spec
npm run generate -- --file ./openapi.json

# CLI — from plain text
npm run generate -- --text "CrowdStrike, API key, needs getIncidents, getDevices"

# CLI — from a published docs URL / Notion page
npm run generate -- --url "https://example.notion.site/api-docs"

# CLI — force update an existing connector
npm run generate -- --file ./api-v2.pdf --update qualys

# CLI — force create (ignore existing)
npm run generate -- --file ./api.pdf --new

# CLI — force a specific AI provider
npm run generate -- --file ./api.pdf --provider gemini

# CLI — dry run (print files, do not write)
npm run generate:dry -- --file ./api.pdf

# CLI — resume a saved pipeline
npm run generate -- --resume crowdstrike

# CLI — fully automated, no human prompts
npm run generate:auto -- --file ./api.pdf

# Web UI
npm run generate:ui
# → open http://localhost:4001
```

---

## Three Interfaces Summary

| Interface | Command | Best For |
|---|---|---|
| **CLI** | `npm run generate -- --file x.pdf` | Developers, CI/CD |
| **Web UI** | `npm run generate:ui` → browser | Visual review, non-technical users |
| **MCP** | Claude Desktop / Cursor | Conversational, AI-assisted |

All three use the same pipeline core (`src/codegen/`). The interface is just the shell.

---

## Implementation Order

1. `src/codegen/providers/` — AI provider layer (Anthropic, Gemini, OpenAI)
2. `src/codegen/extractors/` — document extraction (PDF, OpenAPI, text)
3. `src/codegen/pipeline/event-bus.cjs` — event bus
4. `src/codegen/analyzer.cjs` — document validation
5. `src/codegen/git/branch-manager.cjs` — branch lifecycle
6. `src/codegen/prompt-builder.cjs` + `output-parser.cjs` — AI prompts
7. `src/codegen/file-writer.cjs` + `registry-patcher.cjs` — file generation
8. `src/codegen/differ.cjs` — UPDATE mode diff
9. `src/codegen/hitl/` — all gate types
10. `src/codegen/config/` — config loader
11. `src/codegen/test-runner.cjs` + `test-fixer.cjs` — test loop
12. `src/codegen/code-reviewer.cjs` — review
13. `src/codegen/git/pr-creator.cjs` + `notifier.cjs` — MR + notify
14. `src/codegen/ai-generator.cjs` — top-level orchestrator
15. `interfaces/cli/generate-connector.cjs` — CLI
16. `interfaces/ui/` — Web UI
17. `src/ai/mcp/ConnectorGeneratorServer.ts` — MCP server

---

*Last updated: 2026-04-30*
*Status: Planning complete — ready for implementation*
