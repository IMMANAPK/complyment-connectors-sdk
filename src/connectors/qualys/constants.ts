// ============================================
// QUALYS CONSTANTS - Complyment Connectors SDK
// ============================================

// Qualys API Base URLs by region
export const QUALYS_BASE_URLS = {
  US1: 'https://qualysapi.qualys.com',
  US2: 'https://qualysapi.qg2.apps.qualys.com',
  US3: 'https://qualysapi.qg3.apps.qualys.com',
  EU1: 'https://qualysapi.qualys.eu',
  EU2: 'https://qualysapi.qg2.apps.qualys.eu',
  IN1: 'https://qualysapi.qg1.apps.qualys.in',
  CA1: 'https://qualysapi.qg1.apps.qualys.ca',
  AE1: 'https://qualysapi.qg1.apps.qualys.ae',
} as const

export type QualysRegion = keyof typeof QUALYS_BASE_URLS

// Qualys API Endpoints - Vulnerability Management (VM)
export const QUALYS_VM_API_PATHS = {
  // Scan Operations
  SCAN_LIST: '/api/3.0/fo/scan/',
  SCAN_LAUNCH: '/api/3.0/fo/scan/',
  SCAN_STATUS: '/api/3.0/fo/scan/',
  SCAN_RESULTS: '/api/3.0/fo/scan/',
  SCAN_PAUSE: '/api/3.0/fo/scan/',
  SCAN_RESUME: '/api/3.0/fo/scan/',
  SCAN_CANCEL: '/api/3.0/fo/scan/',
  SCAN_DELETE: '/api/3.0/fo/scan/',

  // Host Detection
  HOST_DETECTIONS: '/api/4.0/fo/asset/host/vm/detection/',

  // Reports (v3.0)
  REPORT_LIST: '/api/3.0/fo/report/',
  REPORT_LAUNCH: '/api/3.0/fo/report/',
  REPORT_FETCH: '/api/3.0/fo/report/',
  REPORT_DELETE: '/api/3.0/fo/report/',

  // Reports (v2.0 - legacy)
  REPORT_LIST_V2: '/api/2.0/fo/report/',

  // Compliance
  COMPLIANCE_CONTROL: '/api/2.0/fo/compliance/control/',

  // Knowledge Base
  VULN_KB: '/api/3.0/fo/knowledge_base/vuln/',

  // Asset Management
  ASSET_HOST_LIST: '/api/3.0/fo/asset/host/',
  ASSET_GROUP_LIST: '/api/3.0/fo/asset/group/',

  // Option Profiles
  OPTION_PROFILES: '/api/3.0/fo/subscription/option_profile/',

  // QPS API (newer REST API)
  QPS_HOST_ASSET: '/qps/rest/2.0/search/am/hostasset',

  // VMDR REST API (required for VMDR-only subscriptions — replaces classic VM detection API)
  VMDR_FINDINGS: '/rest/2.0/fo/finding/',
} as const

// Qualys API Endpoints - Web Application Scanning (WAS)
export const QUALYS_WAS_API_PATHS = {
  WAS_SCAN_LIST: '/qps/rest/3.0/search/was/wasscan',
  WAS_SCAN_GET: '/qps/rest/3.0/get/was/wasscan/',
  WAS_SCAN_LAUNCH: '/qps/rest/3.0/launch/was/wasscan/',
  WAS_FINDINGS: '/qps/rest/3.0/search/was/finding',
  WAS_WEBAPPS: '/qps/rest/3.0/search/was/webapp',
  WAS_REPORT_CREATE: '/qps/rest/3.0/create/was/report',
} as const

// Qualys default settings
export const QUALYS_DEFAULTS = {
  DEFAULT_SCAN_TYPE: 'VM',
  POLL_INTERVAL_MS: 30000,      // 30 seconds
  MAX_POLL_ATTEMPTS: 120,       // 1 hour maximum
  REQUEST_TIMEOUT_MS: 300000,   // 5 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 5000,         // 5 seconds
  TRUNCATION_LIMIT: 1000,       // Max results per request
  KB_FETCH_LIMIT: 100,          // Max QIDs per KB request
} as const

// Qualys Severity Levels (1-5)
export const QUALYS_SEVERITY_LEVELS = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1,
} as const

// Qualys to SDK Severity Mapping
export const QUALYS_SEVERITY_MAP: Record<number, string> = {
  5: 'Critical',
  4: 'High',
  3: 'Medium',
  2: 'Low',
  1: 'Informational',
}

// SDK Severity to Qualys Mapping (reverse)
export const SDK_TO_QUALYS_SEVERITY: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
  informational: 1,
}

// Output formats
export const QUALYS_OUTPUT_FORMATS = {
  XML: 'xml',
  JSON: 'json',
  CSV: 'csv',
} as const

// HTTP Headers for Qualys API
export const QUALYS_HEADERS = {
  XML_CONTENT: {
    'Content-Type': 'text/xml',
    'Accept': 'application/json',
  },
  FORM_CONTENT: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  DEFAULT: {
    'X-Requested-With': 'ComplymentConnectorsSDK',
  },
} as const
