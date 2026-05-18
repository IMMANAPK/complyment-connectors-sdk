# Connector Generator — Architecture Comparison

## Old Architecture: Linear Pipeline

One step runs at a time. Each step is a single LLM call with no retry, no feedback, no parallelism.
If any step fails — the whole run fails with no recovery.

```mermaid
flowchart TD
    A([📄 User uploads API doc]) --> B

    B["① Document Validation\n─────────────────\nOne LLM call\nPass/Fail only"]
    B --> C["② Branch Management\n─────────────────\nRuns git commands\nNo conflict check"]
    C --> D["③ Mode Analysis\n─────────────────\nCreate or Update?\nNo changelog"]
    D --> E["④ Code Generation\n─────────────────\nOne LLM call\nNo feedback loop"]
    E --> F["⑤ TypeScript Check\n─────────────────\ntsc errors?\nNo auto-fix"]
    F --> G["⑥ Run Tests\n─────────────────\nPlaywright\nNo auto-fix"]
    G --> H["⑦ Code Review\n─────────────────\nOne LLM call\nNo scoring"]
    H --> I["⑧ Pull Request\n─────────────────\nCommit + Push + PR\nAll or nothing"]
    I --> J["⑨ Notify\n─────────────────\nSlack / log"]

    J --> Z([✅ Done])

    style A fill:#4A90D9,color:#fff
    style Z fill:#27AE60,color:#fff
    style B fill:#E8E8E8
    style C fill:#E8E8E8
    style D fill:#E8E8E8
    style E fill:#E8E8E8
    style F fill:#E8E8E8
    style G fill:#E8E8E8
    style H fill:#E8E8E8
    style I fill:#E8E8E8
    style J fill:#E8E8E8
```

**Problems with the old approach:**
- ❌ TypeScript errors → whole run fails, no fix attempted
- ❌ Test failures → no retry, no diagnosis
- ❌ Bad review score → code still goes to PR
- ❌ PDF upload failure → cryptic error, no fallback
- ❌ No visibility into what each step is doing internally

---

## New Architecture: Multi-Agent System

Every stage is now a **Supervisor + Child Agents**. Agents run in parallel where possible,
retry on failure, and push feedback upstream so earlier stages can self-correct.

```mermaid
flowchart TD
    A([📄 User uploads API doc]) --> GO

    GO["🧠 GlobalOrchestrator\n────────────────────────\nRoutes stages\nManages run lifecycle\nCross-stage feedback bus"]

    GO --> S1

    subgraph S1["Stage 1 · Document Validation"]
        direction LR
        V1["text-extractor\n(PDF/URL/JSON)"] --> V2["api-analyzer\n(LLM)"] --> V3["quality-checker\n(LLM)"]
    end

    S1 --> S2

    subgraph S2["Stage 2 · Branch Management  ║  Stage 3 · Mode Analysis  (parallel)"]
        direction LR
        B1["branch-checker\n(git.branch)"]
        B2["conflict-detector\n(file.listFiles)"]
        B3["changelog-agent\n(LLM diff)"]
        B4["mode-decider\n(create/update)"]
    end

    S2 --> S4

    subgraph S4["Stage 4 · Code Generation"]
        direction LR
        G1["generator\n(LLM)"] --> G2["file-writer\n(file.writeFile)"]
    end

    S4 --> S5

    subgraph S5["Stage 5 · TypeScript Check  (retry loop)"]
        direction LR
        T1["typecheck-runner\n(tsc)"] --> T2["type-fixer\n(LLM + patch)"] --> T3["typecheck-verifier\n(tsc confirm)"]
    end

    S5 --> S6

    subgraph S6["Stage 6 · Tests  (retry loop)"]
        direction LR
        P1["test-runner\n(Playwright)"] --> P2["test-fixer\n(LLM + patch)"] --> P3["test-verifier\n(Playwright)"]
    end

    S6 --> S7

    subgraph S7["Stage 7 · Code Review  (parallel)"]
        direction TB
        R1["static-analyzer\n(code quality)"]
        R2["security-reviewer\n(hardcoded keys etc)"]
        R1 & R2 --> R3["scorer\n(verdict: APPROVED / WARN / REJECTED)"]
    end

    S7 --> S8

    subgraph S8["Stage 8 · Pull Request"]
        direction LR
        PR1["commit-agent\n(git.commit)"] --> PR2["push-agent\n(git.push)"] --> PR3["pr-creator\n(GitHub PR)"]
    end

    S8 --> S9

    subgraph S9["Stage 9 · Notification"]
        direction LR
        N1["slack-notifier"]
        N2["summary-agent\n(run summary)"]
    end

    S9 --> Z([✅ Done])

    %% Cross-stage feedback arrows
    S5 -. "❗ TypeScript errors\n→ regenerate" .-> S4
    S6 -. "❗ Test failures\n→ regenerate" .-> S4
    S7 -. "❗ REJECTED\n→ regenerate" .-> S4

    style A fill:#4A90D9,color:#fff
    style Z fill:#27AE60,color:#fff
    style GO fill:#8E44AD,color:#fff
    style S1 fill:#EBF5FB,stroke:#3498DB
    style S2 fill:#EBF5FB,stroke:#3498DB
    style S4 fill:#FEF9E7,stroke:#F39C12
    style S5 fill:#FEF9E7,stroke:#F39C12
    style S6 fill:#FEF9E7,stroke:#F39C12
    style S7 fill:#EAFAF1,stroke:#27AE60
    style S8 fill:#EAFAF1,stroke:#27AE60
    style S9 fill:#EAFAF1,stroke:#27AE60
```

---

## Infrastructure Added (runs behind every stage)

```mermaid
flowchart LR
    MB["📨 MessageBus\nAsync pub/sub events\nper pipeline run"]
    AM["🧠 AgentMemory\nShared + scoped memory\nCross-stage feedback store"]
    TL["📋 TraceLogger\nJSON traces per agent\n.connector-gen/traces/"]
    BT["💰 BudgetTracker\nToken usage per stage\nPrevents runaway LLM cost"]
    TR["🔧 ToolRegistry\nScoped tool access\n(least privilege per agent)"]

    MB & AM & BT & TR & TL --> Core["Every Agent\n& Supervisor"]
```

---

## Side-by-Side Summary

| | Old Pipeline | New Multi-Agent |
|---|---|---|
| **Structure** | 9 sequential steps | 9 Supervisors × 2-3 Child Agents each |
| **Parallelism** | None | Security + Static review run in parallel; Branch + Analysis run in parallel |
| **TypeScript errors** | Run fails | Auto-fixed by LLM, re-verified |
| **Test failures** | Run fails | Auto-diagnosed and patched, re-run |
| **Bad review** | PR created anyway | Feedback sent back to codegen, regenerated |
| **PDF extraction** | Breaks on pdf-parse v2 | pdftotext CLI primary, lib fallback |
| **Observability** | console.log | JSON traces per agent in .connector-gen/traces/ |
| **Token cost control** | None | BudgetTracker per stage |
| **Rollout** | — | Feature flag: `useMultiAgent: false` (safe default) |
