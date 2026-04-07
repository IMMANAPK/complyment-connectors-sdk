// ============================================
// SENTINELONE API CONSTANTS - Complyment Connectors SDK
// ============================================

// ============================================
// API Version
// ============================================

export const SENTINELONE_API_VERSION = '2.1'

// ============================================
// API Paths
// ============================================

export const SENTINELONE_API_PATHS = {
  // System
  SYSTEM_STATUS: `/web/api/v${SENTINELONE_API_VERSION}/system/status`,

  // Agents
  AGENTS: `/web/api/v${SENTINELONE_API_VERSION}/agents`,
  AGENT_BY_ID: (id: string) => `/web/api/v${SENTINELONE_API_VERSION}/agents/${id}`,
  AGENT_DISCONNECT: (id: string) => `/web/api/v${SENTINELONE_API_VERSION}/agents/${id}/actions/disconnect`,
  AGENT_CONNECT: (id: string) => `/web/api/v${SENTINELONE_API_VERSION}/agents/${id}/actions/connect`,
  AGENT_SCAN: (id: string) => `/web/api/v${SENTINELONE_API_VERSION}/agents/${id}/actions/initiate-scan`,

  // Threats
  THREATS: `/web/api/v${SENTINELONE_API_VERSION}/threats`,
  THREAT_MITIGATE: (action: string) => `/web/api/v${SENTINELONE_API_VERSION}/threats/mitigate/${action}`,

  // Activities
  ACTIVITIES: `/web/api/v${SENTINELONE_API_VERSION}/activities`,

  // Groups & Sites
  GROUPS: `/web/api/v${SENTINELONE_API_VERSION}/groups`,
  SITES: `/web/api/v${SENTINELONE_API_VERSION}/sites`,
} as const

// ============================================
// Default Values
// ============================================

export const SENTINELONE_DEFAULTS = {
  LIMIT: 50,
  MAX_LIMIT: 100,
} as const

// ============================================
// Threat Status Mapping
// ============================================

export const SENTINELONE_THREAT_STATUS_MAP: Record<string, 'active' | 'resolved' | 'investigating'> = {
  active: 'active',
  suspicious: 'investigating',
  mitigated: 'resolved',
  resolved: 'resolved',
  blocked: 'resolved',
} as const
