export const DEFAULT_BASE_URL = 'https://usea1.sentinelone.net/web/api/v2.1'

export const API_PATHS = {
  HEALTH: '/system/status',
  GET_THREATS: '/threats',
  MITIGATE_THREAT: '/threats/mitigate',
  GET_AGENTS: '/agents',
  ISOLATE_AGENT: '/agents/actions/disconnect',
  RECONNECT_AGENT: '/agents/actions/connect',
  GET_SITES: '/sites',
  GET_ACTIVITIES: '/activities',
  GET_GROUPS: '/groups',
  GET_ALERTS: '/cloud-detection/alerts',
} as const
