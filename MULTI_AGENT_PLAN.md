# Multi-Agent System — Implementation Plan

## Overview

Convert the Connector Generator pipeline from a linear 9-step orchestrator into a
true production-grade multi-agent system where every stage runs as a
**Supervisor + Child Agent hierarchy**.

---

## Architecture

```
GlobalOrchestrator
│
├── Stage 1: DocumentValidationSupervisor
│   ├── TextExtractorAgent     [tools: file.readFile, file.extractPdf, file.extractUrl]
│   ├── ApiAnalyzerAgent       [tools: llm.analyze]
│   └── QualityCheckerAgent    [tools: llm.generate]
│
├── Stage 2: BranchSupervisor
│   ├── BranchCheckerAgent     [tools: git.branch, git.listBranches]
│   └── ConflictAgent          [tools: git.diff, file.listFiles]
│
├── Stage 3: AnalysisSupervisor
│   ├── ChangelogAgent         [tools: file.readFile, llm.analyze]
│   └── ModeDeciderAgent       [tools: llm.generate]
│
├── Stage 4: CodegenSupervisor
│   ├── PromptBuilderAgent     [tools: llm.generate]
│   ├── GeneratorAgent         [tools: llm.generate, file.writeFile]
│   └── FileWriterAgent        [tools: file.writeFile, file.listFiles]
│
├── Stage 5: TypecheckSupervisor
│   ├── TypecheckRunnerAgent   [tools: code.runTsc]
│   ├── TypeFixerAgent         [tools: llm.generate, file.readFile, file.writeFile]
│   └── VerifierAgent          [tools: code.runTsc]
│
├── Stage 6: TestSupervisor
│   ├── TestRunnerAgent        [tools: test.runPlaywright]
│   ├── TestFixerAgent         [tools: llm.generate, file.readFile, file.writeFile]
│   └── TestVerifierAgent      [tools: test.runPlaywright]
│
├── Stage 7: ReviewSupervisor
│   ├── StaticAnalyzerAgent    [tools: llm.review, file.readFile]
│   ├── SecurityReviewerAgent  [tools: llm.review]
│   └── ScorerAgent            [tools: llm.generate]
│
├── Stage 8: PullRequestSupervisor
│   ├── CommitAgent            [tools: git.commit, git.push]
│   └── PRCreatorAgent         [tools: git.createPR]
│
└── Stage 9: NotificationSupervisor
    └── NotifyAgent            [tools: llm.generate]
```

---

## Core Modules

### Phase 1 — Core Framework (implement first)

| File | Purpose |
|------|---------|
| `agents/types/AgentOutput.cjs` | Standard child agent return schema |
| `agents/types/StageResult.cjs` | Standard stage return schema |
| `agents/types/AgentContext.cjs` | Context passed to every child agent |
| `agents/infrastructure/MessageBus.cjs` | Async pub/sub, topic-based routing |
| `agents/infrastructure/AgentMemory.cjs` | Shared memory + cross-stage feedback |
| `agents/infrastructure/TraceLogger.cjs` | Per-agent execution logs |
| `agents/infrastructure/BudgetTracker.cjs` | Token/call budget control |
| `agents/infrastructure/SchemaValidator.cjs` | Output schema validation |
| `agents/infrastructure/ToolRegistry.cjs` | Tool registration + scoped access |
| `agents/tools/file.tools.cjs` | readFile, writeFile, listFiles |
| `agents/tools/code.tools.cjs` | runTsc, applyPatch, formatCode |
| `agents/tools/test.tools.cjs` | runPlaywright, parseResults |
| `agents/tools/git.tools.cjs` | branch, commit, push, createPR |
| `agents/tools/llm.tools.cjs` | generate, analyze, review |
| `agents/core/BaseAgent.cjs` | ReAct loop (think → tool → observe → repeat) |
| `agents/core/BaseSupervisor.cjs` | plan → spawn → validate → decide loop |
| `agents/core/GlobalOrchestrator.cjs` | Entry point with feature flag |

### Phase 2 — Migrate 3 Stages
- DocumentValidation (Stage 1)
- CodeGeneration (Stage 4)
- TypeCheck (Stage 5)

### Phase 3 — GlobalOrchestrator + Coexistence Layer
### Phase 4 — Remaining 6 Stages

---

## Gap Solutions

### Gap 1: Coexistence Strategy
```
config.useMultiAgent = false → run existing orchestrator.cjs as-is
config.useMultiAgent = true  → migrated stages use new system
                               unmigrated stages delegate to old orchestrator
```
Feature flag in `.connector-gen.config.json`:
```json
{ "useMultiAgent": true }
```

### Gap 2: Tool Inventory
```
file.tools   → readFile, writeFile, listFiles
code.tools   → runTsc, applyPatch, formatCode
test.tools   → runPlaywright, parseResults
git.tools    → branch, commit, push, createPR
llm.tools    → generate, analyze, review
```

### Gap 3: AgentContext Schema
```js
{
  runId:        string,       // pipeline run ID
  stageId:      string,       // which stage is running
  agentId:      string,       // unique agent instance ID
  memory:       AgentMemory,  // shared memory (scoped access)
  budget:       BudgetTracker,// token + call limits
  logger:       TraceLogger,  // trace logging
  bus:          MessageBus,   // inter-agent communication
  parentTrace:  string,       // trace ID of spawning supervisor
  allowedTools: string[],     // ONLY these tools available
  retryLimit:   number,       // max retries for this agent
  outputSchema: object|null,  // expected output shape
  modelOverride: string|null  // specific LLM model for this agent
}
```

### Gap 4: MessageBus Pattern
- Async pub/sub with topic-based routing
- `publish(topic, message)` — fire and forget
- `subscribe(topic, handler)` — returns unsubscribe fn
- `request(topic, message, timeout)` — request/reply for sync needs
- One bus per run ID (isolated between concurrent runs)

### Gap 5: Token Budget Fallback
```
Provider supports token count → use real count
Gemini / no count support     → estimate: chars / 4 ≈ tokens
Hard limits per stage:
  - maxTokens: 100,000 (configurable)
  - maxCalls:  20 LLM calls (configurable)
```
If budget exhausted → agent returns `blocked` → Supervisor escalates.

### Gap 6: HITL Integration
- `BaseSupervisor.escalate()` routes through existing `ConversationGate.cjs`
- No new human approval flow — reuses `gate()` and `webGate()`
- Supervisor decision: `ESCALATE` → calls `gate(stageId, summary, stepConfig)`

### Gap 7: Cross-Stage Feedback
```
GlobalOrchestrator manages feedback via AgentMemory:
  - downstream stage: memory.pushFeedback(fromStage, toStage, feedback)
  - upstream stage:   memory.pullFeedback(stageId) at start of each run
  - If feedback requires rework: GlobalOrchestrator re-runs the affected stage
```

---

## Child Agent Contract

Every child agent MUST return:
```js
{
  status:      'success' | 'failed' | 'needs_retry' | 'blocked',
  confidence:  0-100,
  summary:     string,
  result:      object,
  errors:      string[],
  tools_used:  string[],
  next_action: 'continue' | 'retry' | 'spawn_more' | 'escalate'
}
```

---

## Stage Result Contract

Every supervisor MUST return:
```js
{
  stageId:        string,
  status:         'success' | 'failed' | 'needs_retry' | 'blocked' | 'skipped',
  duration:       number,   // ms
  tokensUsed:     number,
  agentsSpawned:  string[], // agent IDs
  output:         object,   // stage-specific result
  feedback:       object    // feedback for other stages
}
```

---

## Supervisor Loop

```
for each stage:
  1. pull cross-stage feedback from memory
  2. plan(task + feedback) → AgentPlan[]
  3. for each plan:
       spawn child agent with scoped tools + context
       [parallel where safe]
  4. collect all child results
  5. validate each output against schema
  6. evaluate(results) → CONTINUE | RETRY | SPAWN_MORE | ESCALATE
  7. if RETRY → re-spawn failed agents (up to retryLimit)
  8. if SPAWN_MORE → spawn additional specialist agents
  9. if ESCALATE → route to ConversationGate.cjs (HITL)
  10. push feedback to memory for downstream stages
  11. return StageResult
```

---

## BaseAgent ReAct Loop

```
receive task + tools + context
loop (max: retryLimit × 5 iterations):
  if budget.isExhausted() → return blockedOutput
  think(task, history) → { action, toolName?, args?, result?, reasoning }
  if action === 'complete' → return successOutput(result)
  execute tool(toolName, args)
  log tool call to TraceLogger
  append to history
return failedOutput('max iterations reached')
```

---

## Parallel Execution Rules

| Stage | Can Parallelize? | Notes |
|-------|-----------------|-------|
| TextExtractor + ApiAnalyzer | No — analyzer needs extractor output |
| TypecheckRunner + TestRunner | Yes — independent |
| SecurityReviewer + StyleReviewer | Yes — independent |
| CommitAgent + NotifyAgent | No — commit must finish first |

---

## Model Selection Per Agent

```js
// In config: multiAgent.models
{
  supervisor:   'default',   // uses current provider
  analyst:      'default',
  generator:    'default',
  typechecker:  'default',
  tester:       'default',
  reviewer:     'default'    // could use stronger model here
}
```

---

## Implementation Order

```
Phase 1 (Core Framework):
  ✅ types/AgentOutput.cjs
  ✅ types/StageResult.cjs
  ✅ types/AgentContext.cjs
  ✅ infrastructure/MessageBus.cjs
  ✅ infrastructure/AgentMemory.cjs
  ✅ infrastructure/TraceLogger.cjs
  ✅ infrastructure/BudgetTracker.cjs
  ✅ infrastructure/SchemaValidator.cjs
  ✅ infrastructure/ToolRegistry.cjs
  ✅ tools/file.tools.cjs
  ✅ tools/code.tools.cjs
  ✅ tools/test.tools.cjs
  ✅ tools/git.tools.cjs
  ✅ tools/llm.tools.cjs
  ✅ core/BaseAgent.cjs
  ✅ core/BaseSupervisor.cjs
  ✅ core/GlobalOrchestrator.cjs

Phase 2 (First 3 Stages):
  ✅ stages/validate/DocumentValidationSupervisor.cjs
  ✅ stages/validate/TextExtractorAgent role via BaseAgent
  ✅ stages/validate/ApiAnalyzerAgent role via BaseAgent
  ✅ stages/validate/QualityCheckerAgent role via BaseAgent
  ✅ stages/codegen/CodegenSupervisor.cjs
  ✅ stages/codegen/GeneratorAgent role via BaseAgent
  ✅ stages/codegen/FileWriterAgent role via BaseAgent
  ✅ stages/typecheck/TypecheckSupervisor.cjs
  ✅ stages/typecheck/TypecheckRunnerAgent role via BaseAgent
  ✅ stages/typecheck/TypeFixerAgent role via BaseAgent
  ✅ stages/typecheck/VerifierAgent role via BaseAgent

Phase 3 (GlobalOrchestrator + Coexistence):
  ✅ core/GlobalOrchestrator.cjs (complete)
  ✅ config/defaults.cjs (add useMultiAgent flag)
  ✅ pipeline/orchestrator.cjs (routes useMultiAgent=true to GlobalOrchestrator)
  ✅ CLI/UI config flag wiring

Phase 4 (Remaining Stages):
  ✅ stages/branch/, analysis/, tests/, review/, pr/, notify/

Final Integration Fixes:
  ✅ BaseAgent receives visible AgentMemory snapshot in prompt
  ✅ BaseSupervisor preserves declared child-agent order while parallelizing contiguous parallel groups
  ✅ GlobalOrchestrator honors runTypecheck/runTests skip flags
```

---

## Files NOT changed
- `src/codegen/pipeline/orchestrator.cjs` — untouched, runs when useMultiAgent=false
- `src/codegen/hitl/ConversationGate.cjs` — untouched, called by BaseSupervisor.escalate()
- `src/codegen/pipeline/event-bus.cjs` — untouched, still used by GlobalOrchestrator
- All existing UI and server files — untouched

---

## Config Example

`.connector-gen.config.json`:
```json
{
  "useMultiAgent": true,
  "multiAgent": {
    "maxCallsPerStage": 20,
    "tokenBudgetPerStage": 100000,
    "maxRetries": 3,
    "models": {
      "supervisor": "default",
      "generator": "default",
      "reviewer": "default"
    }
  }
}
```
