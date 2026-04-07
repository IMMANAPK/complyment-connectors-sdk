// ============================================
// CORE TYPES - Foundation of Complyment SDK
// ============================================

// Auth Types
export enum AuthType {
  API_KEY = 'api_key',
  BASIC = 'basic',
  OAUTH2 = 'oauth2',
  BEARER = 'bearer',
  VAULT = 'vault',
}

// Connector Status
export enum ConnectorStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  DEGRADED = 'degraded',
  ERROR = 'error',
  CONNECTING = 'connecting',
}

// Log Levels (string-based for BaseConnector logging)
// Note: Logger.ts has its own numeric LogLevel for internal use
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SILENT = 'silent',
}

// ============================================
// Auth Config Interfaces
// ============================================

export interface ApiKeyAuthConfig {
  type: AuthType.API_KEY
  apiKey: string
  headerName?: string // default: 'X-API-Key'
}

export interface BasicAuthConfig {
  type: AuthType.BASIC
  username: string
  password: string
}

export interface OAuth2Config {
  type: AuthType.OAUTH2
  clientId: string
  clientSecret: string
  tokenUrl: string
  scope?: string
  redirectUri?: string
}

export interface BearerAuthConfig {
  type: AuthType.BEARER
  token: string
}

export interface VaultAuthConfig {
  type: AuthType.VAULT
  vaultUrl: string
  secretPath: string
  token: string
}

export type AuthConfig =
  | ApiKeyAuthConfig
  | BasicAuthConfig
  | OAuth2Config
  | BearerAuthConfig
  | VaultAuthConfig

// ============================================
// Connector Config
// ============================================

export interface ConnectorConfig {
  name: string
  baseUrl: string
  auth: AuthConfig
  timeout?: number        // default: 30000ms
  retries?: number        // default: 3
  rateLimit?: {
    requests: number      // max requests
    perSeconds: number    // per N seconds
  }
  cache?: {
    enabled: boolean
    ttl: number           // seconds
  }
  dryRun?: boolean        // mock mode - no real API calls
  apiVersion?: string
  telemetry?: boolean
  logger?: LogLevel
}

// ============================================
// Connector Response
// ============================================

export interface ConnectorResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
  timestamp: Date
  connector: string
  cached?: boolean
  dryRun?: boolean
}

// ============================================
// Health Check
// ============================================

export interface HealthCheckResult {
  connector: string
  status: ConnectorStatus
  latency?: number        // ms
  message?: string
  checkedAt: Date
}

// ============================================
// Pagination
// ============================================

export interface PaginationOptions {
  page?: number
  limit?: number
  offset?: number
  cursor?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  nextCursor?: string
}

// ============================================
// Events
// ============================================

export enum ConnectorEvent {
  CONNECTED = 'connector.connected',
  DISCONNECTED = 'connector.disconnected',
  ERROR = 'connector.error',
  DATA_FETCHED = 'data.fetched',
  RATE_LIMITED = 'connector.rate_limited',
  RETRY = 'connector.retry',
  CACHE_HIT = 'cache.hit',
  CACHE_MISS = 'cache.miss',
}

// ============================================
// Normalized Data Schemas (cross-connector)
// ============================================

export interface NormalizedVulnerability {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  cvss?: number
  cve?: string
  affectedAsset: string
  source: string          // 'qualys' | 'sentinelone' etc
  detectedAt: Date
  raw?: unknown           // original response
}

export interface NormalizedAsset {
  id: string
  hostname: string
  ipAddress: string
  os?: string
  type: 'server' | 'workstation' | 'network' | 'cloud' | 'unknown'
  source: string
  lastSeen: Date
  raw?: unknown
}

export interface NormalizedThreat {
  id: string
  name: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'active' | 'resolved' | 'investigating'
  affectedAsset: string
  source: string
  detectedAt: Date
  raw?: unknown
}