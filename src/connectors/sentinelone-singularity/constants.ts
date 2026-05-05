export const DEFAULT_BASE_URL = 'https://api.example.com'

export const API_PATHS = {
  HEALTH: '/health',
  GET_THREATS: '/get-threats',
  MITIGATE_THREAT: '/mitigate-threat',
  GET_AGENTS: '/get-agents',
  ISOLATE_AGENT: '/isolate-agent',
  GET_SITES: '/get-sites',
  GET_ACTIVITIES: '/get-activities',
  GET_GROUPS: '/get-groups',
  GET_ALERTS: '/get-alerts',
} as const
