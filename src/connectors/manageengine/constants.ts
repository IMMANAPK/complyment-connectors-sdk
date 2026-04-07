// ============================================
// MANAGEENGINE API CONSTANTS - Complyment Connectors SDK
// ============================================

// ============================================
// API Version
// ============================================

export const MANAGEENGINE_API_VERSION = '1.3'

// ============================================
// API Paths
// ============================================

export const MANAGEENGINE_API_PATHS = {
  // OAuth
  OAUTH_TOKEN: '/oauth/token',

  // Patch Management
  PATCHES: `/api/${MANAGEENGINE_API_VERSION}/patch/allpatches`,
  PATCH_BY_ID: (id: string) => `/api/${MANAGEENGINE_API_VERSION}/patch/${id}`,

  // Computer Management
  COMPUTERS: `/api/${MANAGEENGINE_API_VERSION}/patch/allsystems`,
  COMPUTER_BY_ID: (id: string) => `/api/${MANAGEENGINE_API_VERSION}/patch/systems/${id}`,
} as const

// ============================================
// Default Values
// ============================================

export const MANAGEENGINE_DEFAULTS = {
  PAGE_NUMBER: 1,
  PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
} as const

// ============================================
// Patch Status Values
// ============================================

export const MANAGEENGINE_PATCH_STATUS = {
  MISSING: 'Missing',
  INSTALLED: 'Installed',
  FAILED: 'Failed',
} as const

// ============================================
// Severity Values
// ============================================

export const MANAGEENGINE_SEVERITY = {
  CRITICAL: 'Critical',
  IMPORTANT: 'Important',
  MODERATE: 'Moderate',
  LOW: 'Low',
} as const
