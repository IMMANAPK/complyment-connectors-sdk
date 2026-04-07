// ============================================
// JIRA API CONSTANTS - Complyment Connectors SDK
// ============================================

// ============================================
// API Versions
// ============================================

export const JIRA_API_VERSION = '3'
export const JIRA_AGILE_API_VERSION = '1.0'

// ============================================
// REST API Paths (v3)
// ============================================

export const JIRA_API_PATHS = {
  // User
  MYSELF: `/rest/api/${JIRA_API_VERSION}/myself`,

  // Projects
  PROJECT_SEARCH: `/rest/api/${JIRA_API_VERSION}/project/search`,
  PROJECT_BY_KEY: (key: string) => `/rest/api/${JIRA_API_VERSION}/project/${key}`,

  // Issues
  ISSUE_SEARCH: `/rest/api/${JIRA_API_VERSION}/search/jql`,
  ISSUE_BY_KEY: (key: string) => `/rest/api/${JIRA_API_VERSION}/issue/${key}`,
  ISSUE_CREATE: `/rest/api/${JIRA_API_VERSION}/issue`,
  ISSUE_BULK_CREATE: `/rest/api/${JIRA_API_VERSION}/issue/bulk`,

  // Comments
  ISSUE_COMMENTS: (key: string) => `/rest/api/${JIRA_API_VERSION}/issue/${key}/comment`,

  // Transitions
  ISSUE_TRANSITIONS: (key: string) => `/rest/api/${JIRA_API_VERSION}/issue/${key}/transitions`,
} as const

// ============================================
// Agile API Paths (v1.0)
// ============================================

export const JIRA_AGILE_API_PATHS = {
  BOARD_SPRINTS: (boardId: number) => `/rest/agile/${JIRA_AGILE_API_VERSION}/board/${boardId}/sprint`,
} as const

// ============================================
// Default Values
// ============================================

export const JIRA_DEFAULTS = {
  MAX_RESULTS: 50,
  DEFAULT_ISSUE_FIELDS: [
    'summary',
    'description',
    'status',
    'priority',
    'issuetype',
    'project',
    'assignee',
    'reporter',
    'labels',
    'created',
    'updated',
    'duedate',
    'resolutiondate',
    'components',
  ],
  DEFAULT_DATE_RANGE_DAYS: 365,
} as const

// ============================================
// Priority Mapping
// ============================================

export const JIRA_SEVERITY_TO_PRIORITY = {
  critical: 'Highest',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
} as const
