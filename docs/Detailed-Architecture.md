# 🏗️ Complyment Connectors SDK - Detailed Architecture

This document outlines the detailed architectural blueprints of the **@skill-mine/complyment-connectors-sdk**, designed for enterprise scale, resilience, and AI-native integration. These diagrams are generated using MermaidJS so they render natively in Markdown, providing an impressive technical presentation for management and stakeholders.

---

## 🗺️ 1. High-Level System Architecture

The SDK is deliberately layered to decouple external orchestration (AI, Applications) from internal execution logic, middleware services, and connector implementations.

```mermaid
flowchart TB
    classDef layerBox fill:#f8fbff,stroke:#cbd5e1,stroke-width:2px,color:#334155,rx:10,ry:10
    classDef appNode fill:#eff6ff,stroke:#3b82f6,stroke-width:2px,color:#1e3a8a,rx:5,ry:5
    classDef aiNode fill:#fdf4ff,stroke:#d946ef,stroke-width:2px,color:#701a75,rx:5,ry:5
    classDef svcNode fill:#fefce8,stroke:#eab308,stroke-width:2px,color:#713f12,rx:5,ry:5
    classDef coreNode fill:#fef2f2,stroke:#ef4444,stroke-width:2px,color:#7f1d1d,rx:5,ry:5
    classDef connNode fill:#f0fdf4,stroke:#22c55e,stroke-width:2px,color:#14532d,rx:5,ry:5
    classDef mdwNode fill:#fff7ed,stroke:#f97316,stroke-width:2px,color:#7c2d12,rx:5,ry:5
    classDef extNode fill:#f3f4f6,stroke:#64748b,stroke-width:2px,stroke-dasharray: 5 5,color:#0f172a,rx:5,ry:5

    subgraph AppLayer ["🚀 Application Layer"]
        direction LR
        UserApp["💻 User Apps"]:::appNode
        CLI["⌨️ CLI Tools"]:::appNode
        Web["🌐 Web Apps"]:::appNode
        Serverless["⚡ Serverless"]:::appNode
    end

    subgraph AILayer ["🧠 AI Agents Layer"]
        direction LR
        MCP["⚙️ MCP Server"]:::aiNode
        LangChain["🦜️🔗 LangChain"]:::aiNode
        VercelAI["▲ Vercel AI"]:::aiNode
        OpenAI["🤖 OpenAI Agents"]:::aiNode
        Orchestrator["🎼 Orchestrator"]:::aiNode
        HITL["👤 HITL Manager"]:::aiNode
        Semantic["🔍 Semantic Search"]:::aiNode
    end

    subgraph ServiceLayer ["⚙️ Capabilities & Middleware"]
        direction LR
        Norm["🔄 Normalization"]:::svcNode
        Stream["🌊 Streaming"]:::svcNode
        Audit["📝 Audit Log"]:::svcNode
        Webhooks["🪝 Webhooks"]:::svcNode
        
        CB["🔌 Circuit Breaker"]:::mdwNode
        RL["🚦 Rate Limiter"]:::mdwNode
        Cache["💾 Cache Layer"]:::mdwNode
        Retry["🔁 Retry Handler"]:::mdwNode
    end

    subgraph CoreLayer ["🏗️ Core Foundation"]
        direction LR
        Base["📦 BaseConnector"]:::coreNode
        Registry["📋 Registry"]:::coreNode
        HTTP["🌐 HTTP Client"]:::coreNode
        Auth["🔑 Auth Manager"]:::coreNode
    end

    subgraph ConnectorLayer ["🔌 SDK Connectors"]
        direction LR
        Qualys["🛡️ Qualys"]:::connNode
        S1["🛡️ SentinelOne"]:::connNode
        CP["🧱 Checkpoint"]:::connNode
        ME["🔧 ManageEngine"]:::connNode
        Jira["🎫 Jira"]:::connNode
        Zoho["🤝 Zoho CRM"]:::connNode
        Tenable["☁️ Tenable"]:::connNode
    end

    subgraph ExternalLayer ["🌍 Vendor APIs"]
        direction LR
        QAPI("Qualys API"):::extNode
        S1API("S1 API"):::extNode
        CPAPI("Checkpoint API"):::extNode
        MEAPI("ME API"):::extNode
        JAPI("Jira API"):::extNode
        ZAPI("Zoho API"):::extNode
        TAPI("Tenable API"):::extNode
    end

    %% Edge Links
    AppLayer ==>|"Consumes SDK Method"| AILayer
    AppLayer ==>|"Direct Invocation"| ServiceLayer
    AILayer ==>|"Executes Tools"| ServiceLayer
    
    ServiceLayer ==>|"Utilizes"| CoreLayer
    CoreLayer ==>|"Maintains & Proxies"| ConnectorLayer
    
    Qualys -.->|"TLS/HTTPS"| QAPI
    S1 -.->|"TLS/HTTPS"| S1API
    CP -.->|"TLS/HTTPS"| CPAPI
    ME -.->|"TLS/HTTPS"| MEAPI
    Jira -.->|"TLS/HTTPS"| JAPI
    Zoho -.->|"TLS/HTTPS"| ZAPI
    Tenable -.->|"TLS/HTTPS"| TAPI
    
    %% Setup class definitions
    class AppLayer,AILayer,ServiceLayer,CoreLayer,ConnectorLayer,ExternalLayer layerBox
```

---

## 🛡️ 2. Request Resilience & Data Flow

A major architectural highlight of the Connectors SDK is its robust middleware execution pipeline. It provides automatic self-healing, saving the engineering team hundreds of hours in error-handling boilerplate.

```mermaid
sequenceDiagram
    autonumber
    actor App as 📱 Client App
    participant SDK as 🧰 SDK Method
    participant Cache as 💾 Local Cache
    participant RL as 🚦 Rate Limiter
    participant CB as 🔌 Circuit Breaker
    participant API as 🌍 Vendor API
    
    App->>SDK: API Request (e.g. `getAssets()`)
    SDK->>Cache: Check Local Cache Entity
    
    alt Cache Hit (Within TTL)
        Cache-->>SDK: Return cached object
        SDK-->>App: Fast Return ⚡ (Sub-ms)
    else Cache Miss
        SDK->>RL: Request API Quota Tokens
        RL-->>SDK: ✅ Tokens Acquired
        
        SDK->>CB: Evaluate Subsystem Health
        alt Circuit Open (Failing Fast)
            CB-->>SDK: ❌ System Halts (CircuitOpenException)
            SDK-->>App: Fail Fast (Protects Downstream App)
        else Circuit Closed (Healthy Network)
            SDK->>API: Outbound HTTP Request + Auth Envelope
            
            alt 200 OK Success
                API-->>SDK: JSON Enterprise Response
                SDK->>CB: Record Remote Success
                SDK->>Cache: Synchronize Entity with Cache
                SDK-->>App: Standardized, Typed Data Model ✅
            else 429 Too Many Requests
                API-->>SDK: 429 API Tier Exhausted
                SDK->>SDK: Exponential Backoff Retry ⏳ (e.g. 500ms -> 1s)
                SDK->>API: HTTP Resend Request (Retry 1)
                API-->>SDK: Valid Response
                SDK-->>App: Resolution Acquired ✅
            else 500 Subsystem Failure
                API-->>SDK: 500 Internal Service Error
                SDK->>CB: Mark Degradation Record ❌
                SDK-->>App: Safely Throws Typed Error Context
            end
        end
    end
```

---

## 🧬 3. Extensible Class Hierarchy (OOP)

By enforcing an abstract base class pattern, the SDK maintains absolute 100% type-safety while scaling effortlessly when onboarding new vendor platforms.

```mermaid
classDiagram
    direction TB
    class BaseConnector {
        <<abstract>>
        #config: ConnectorConfig
        #client: AxiosInstance
        #status: ConnectorStatus
        #cache: CacheLayer Map
        +authenticate()* Promise~void~
        +testConnection() Promise~boolean~
        +healthCheck() Promise~HealthResult~
        #buildPaginatedResponse() TypedResponse
        #executeWithRetry() Promise~T~
    }
    
    class QualysConnector {
        -platform: QualysPlatform
        -apiVersion: string
        +getAssets(filter)
        +getCriticalVulnerabilities()
        +getNormalizedVulnerabilities()
        +launchScan(params)
    }
    
    class SentinelOneConnector {
        -siteId: string
        -apiVersion: string
        +getThreats(filter)
        +quarantineThreat(id)
        +killThreat(id)
        +remediateThreat(id)
    }
    
    class JiraConnector {
        -cloudId: string
        -email: string
        +getIssues(filter)
        +createSecurityTicket(vuln)
        +transitionIssue(key, state)
        +addComment(key, author)
    }

    BaseConnector <|-- QualysConnector
    BaseConnector <|-- SentinelOneConnector
    BaseConnector <|-- JiraConnector
    BaseConnector <|-- CheckpointConnector
    BaseConnector <|-- ManageEngineConnector
```

---

## 🤖 4. AI-Native Tool Execution Flow

The Connectors SDK naturally wraps complex vendor implementations into localized AI-readable schema "Tools", empowering frameworks like `Vercel AI` and internal `MCP` Servers.

```mermaid
stateDiagram-v2
    [*] --> Context: User Prompts Orchestrator
    
    state AI_Agent {
        direction LR
        LLM[Large Language Model]
        Context[System Context Window]
    }
    
    AI_Agent --> Adapter: Decides to "Call Tool" (e.g. get_critical_vulns)
    
    state Framework_Adapter {
        direction TB
        Adapter[MCP / Langchain Wrapper] --> Parse[Translate AI Schema -> SDK Call]
    }
    
    Parse --> Execution_Engine: Invoke Native Function
    
    state Execution_Engine {
        direction LR
        isHighRisk{High Risk Mutator?}
        isHighRisk --> Approval_Layer: Yes (e.g. 'killThreat')
        isHighRisk --> Vendor_Execution: No (e.g. 'fetchAssets')
    }
    
    Approval_Layer --> Vendor_Execution: Human-In-The-Loop Approves ✅
    Approval_Layer --> Reject_State: Human Denies Execution ❌
    
    Vendor_Execution --> Native_Ext: API Secure Invocation
    Native_Ext --> Context: Normalize Telemetry & Yield to Context
    Context --> AI_Agent: Feedback Loop & AI Confirmation
```
