// ============================================
// COMPLYMENT CONNECTORS SDK - Main Export
// ============================================
// @skill-mine/complyment-connectors-sdk
// Enterprise Security Tool Connectors SDK
// ============================================

// ============================================
// Core
// ============================================

export { BaseConnector } from './core/BaseConnector'
export { ConnectorRegistry, registry } from './core/ConnectorRegistry'
export * from './core/types'
export * from './core/errors'

// ============================================
// Connectors
// ============================================

export { QualysConnector } from './connectors/qualys/QualysConnector'
export * from './connectors/qualys/types'
export * from './connectors/qualys/constants'
export {
    parseHostDetections,
    parseVMDRFindings,
    emptyReport,
    parseWASFindings,
    parseVulnerabilityKB,
    enrichVulnerabilitiesWithKB,
    parseVMScanList,
    parseWASScanList,
    parseScanStatusResponse,
    extractScanRefFromLaunchResponse,
} from './connectors/qualys/parser'

export { SentinelOneConnector } from './connectors/sentinelone/SentinelOneConnector'
export * from './connectors/sentinelone/types'

export { CheckpointConnector } from './connectors/checkpoint/CheckpointConnector'
export * from './connectors/checkpoint/types'

export { ManageEngineConnector } from './connectors/manageengine/ManageEngineConnector'
export * from './connectors/manageengine/types'

export { JiraConnector } from './connectors/jira/JiraConnector'
export * from './connectors/jira/types'

export { ZohoConnector } from './connectors/zoho/ZohoConnector'
export * from './connectors/zoho/types'

export { TenableIoConnector } from './connectors/tenable-io/TenableIoConnector'
export * from './connectors/tenable-io/types'
export * from './connectors/tenable-io/constants'

export { TenableScConnector } from './connectors/tenable-sc/TenableScConnector'
export * from './connectors/tenable-sc/types'
export * from './connectors/tenable-sc/constants'

// ============================================
// Auth
// ============================================

export * from './auth/types'

// ============================================
// Middleware
// ============================================

export { RetryHandler, withRetry } from './middleware/RetryHandler'
export type { RetryOptions } from './middleware/RetryHandler'

export { RateLimiter, SlidingWindowRateLimiter } from './middleware/RateLimiter'
export type { RateLimitOptions } from './middleware/RateLimiter'

export { CircuitBreaker } from './middleware/CircuitBreaker'
export type { CircuitBreakerOptions, CircuitBreakerStats, CircuitState } from './middleware/CircuitBreaker'

export { CacheLayer } from './middleware/CacheLayer'
export type { CacheOptions } from './middleware/CacheLayer'

// ============================================
// Telemetry
// ============================================

export { Logger, logger, LogLevel } from './telemetry/Logger'
export type { LogEntry, LoggerOptions } from './telemetry/Logger'

export { Tracer, tracer } from './telemetry/OpenTelemetry'
export type { SpanOptions, Span, TelemetryOptions } from './telemetry/OpenTelemetry'

// ============================================
// Audit
// ============================================

export { AuditLogger, auditLogger } from './audit/AuditLogger'
export type { AuditEntry, AuditAction, AuditStatus } from './audit/AuditLogger'

// ============================================
// Normalization
// ============================================

export { NormalizationEngine, normalizationEngine } from './normalization/NormalizationEngine'
export type { NormalizationResult } from './normalization/NormalizationEngine'

export { validateVulnerabilities, cvssToSeverity } from './normalization/schemas/vulnerability'
export { validateAssets, detectAssetType, isPrivateIP } from './normalization/schemas/asset'

// ============================================
// Streaming
// ============================================

export { StreamManager } from './streaming/StreamManager'

// ============================================
// Secrets
// ============================================

export { VaultHandler } from './secrets/VaultHandler'
export { EnvHandler, envHandler } from './secrets/EnvHandler'

// ============================================
// Webhook
// ============================================

export { WebhookManager } from './webhook/WebhookManager'

// ============================================
// AI - MCP
// ============================================

export {
    MCPServer,
    mcpServer,
    createQualysMCPTools,
    createSentinelOneMCPTools,
} from './ai/mcp/MCPServer'
export type { MCPTool, MCPToolResult } from './ai/mcp/MCPServer'

// ============================================
// AI - LangChain
// ============================================

export { LangChainAdapter } from './ai/langchain/LangChainAdapter'
export type { LangChainTool } from './ai/langchain/LangChainAdapter'

// ============================================
// AI - Vercel AI SDK
// ============================================

export { VercelAIAdapter } from './ai/vercel-ai/VercelAIAdapter'
export type { VercelAITool, VercelAIToolSet } from './ai/vercel-ai/VercelAIAdapter'

// ============================================
// AI - OpenAI Agents
// ============================================

export { OpenAIAgentsAdapter } from './ai/openai-agents/OpenAIAgentsAdapter'
export type { OpenAIAgentTool, OpenAIAgentDefinition } from './ai/openai-agents/OpenAIAgentsAdapter'

// ============================================
// AI - Google ADK
// ============================================

export { GoogleADKAdapter, googleADKAdapter } from './ai/google-adk/GoogleADKAdapter'
export type { GoogleADKTool, GoogleADKToolParam, GoogleADKToolResult, GoogleADKAgentConfig } from './ai/google-adk/GoogleADKAdapter'

// ============================================
// AI - HITL
// ============================================

export { HITLManager, hitlManager } from './ai/hitl/HITLManager'
export type { HITLRequest, HITLStatus, HITLRiskLevel } from './ai/hitl/HITLManager'

// ============================================
// AI - Orchestration
// ============================================

export { AgentOrchestrator, orchestrator } from './ai/orchestration/AgentOrchestrator'
export type { WorkflowDefinition, WorkflowExecution } from './ai/orchestration/AgentOrchestrator'

// ============================================
// AI - Semantic Search
// ============================================

export { SemanticSearch, semanticSearch } from './ai/semantic/SemanticSearch'
export type { SemanticDocument, SemanticSearchResult } from './ai/semantic/SemanticSearch'

// ============================================
// AI - Workflows
// ============================================

export { AgentWorkflow, agentWorkflow } from './ai/workflows/AgentWorkflow'
export type { WorkflowResult } from './ai/workflows/AgentWorkflow'

// ============================================
// SDK Version
// ============================================

export const SDK_VERSION = '0.3.4'
export const SDK_NAME = '@skill-mine/complyment-connectors-sdk'
