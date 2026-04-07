// ============================================
// QUALYS TYPES - Complyment Connectors SDK
// ============================================

import { QualysRegion } from './constants'

// ============================================
// Enums
// ============================================

export enum QualysScanStatus {
  RUNNING = 'Running',
  PAUSED = 'Paused',
  FINISHED = 'Finished',
  ERROR = 'Error',
  CANCELED = 'Canceled',
  QUEUED = 'Queued',
  LOADING = 'Loading',
  SUBMITTED = 'Submitted',
}

export enum QualysScanType {
  VM = 'VM',
  WAS = 'WAS',
  PC = 'PC', // Policy Compliance
}

export type QualysSeverity = 1 | 2 | 3 | 4 | 5

// ============================================
// Enum Helpers
// ============================================

export function validateQualysScanStatus(status: string): QualysScanStatus | null {
  if (!status) return null
  const statusUpper = status.toUpperCase()
  const statusMap: Record<string, QualysScanStatus> = {
    RUNNING: QualysScanStatus.RUNNING,
    PAUSED: QualysScanStatus.PAUSED,
    FINISHED: QualysScanStatus.FINISHED,
    ERROR: QualysScanStatus.ERROR,
    CANCELED: QualysScanStatus.CANCELED,
    CANCELLED: QualysScanStatus.CANCELED,
    QUEUED: QualysScanStatus.QUEUED,
    LOADING: QualysScanStatus.LOADING,
    SUBMITTED: QualysScanStatus.SUBMITTED,
  }
  return statusMap[statusUpper] || null
}

export function isValidQualysScanStatus(status: string): boolean {
  return validateQualysScanStatus(status) !== null
}

export function isQualysScanTerminal(status: QualysScanStatus): boolean {
  return [
    QualysScanStatus.FINISHED,
    QualysScanStatus.ERROR,
    QualysScanStatus.CANCELED,
  ].includes(status)
}

export function isQualysScanActive(status: QualysScanStatus): boolean {
  return [
    QualysScanStatus.RUNNING,
    QualysScanStatus.QUEUED,
    QualysScanStatus.LOADING,
    QualysScanStatus.SUBMITTED,
  ].includes(status)
}

// ============================================
// Config
// ============================================

export interface QualysConfig {
  baseUrl: string
  username: string
  password: string
  region?: QualysRegion
  timeout?: number
  retries?: number
  cache?: { enabled: boolean; ttl: number }
  dryRun?: boolean
  // SSL options
  rejectUnauthorized?: boolean
}

// ============================================
// Vulnerability Types
// ============================================

export interface QualysVulnerability {
  qid: number
  title: string
  severity: QualysSeverity
  ip?: string
  dns?: string
  netbios?: string
  os?: string
  port?: number
  protocol?: string
  ssl?: boolean
  firstFound?: Date
  lastFound?: Date
  lastUpdate?: Date
  timesFound?: number
  results?: string
  status?: string
  // KB enrichment fields
  cvssBase?: number
  cvssTemporal?: number
  cvss3Base?: number
  cvss3Temporal?: number
  cveList?: string[]
  vendorReferenceList?: string[]
  bugtraqList?: string[]
  threat?: string
  impact?: string
  solution?: string
  diagnosis?: string
  consequence?: string
  pciFlag?: boolean
  pciReasons?: string[]
  category?: string
  exploitability?: string
  associatedMalware?: string
  patchable?: boolean
}

export interface QualysHostDetection {
  hostId: string
  ip: string
  dns?: string
  netbios?: string
  os?: string
  trackingMethod?: string
  lastScanDatetime?: Date
  detections: QualysVulnerability[]
}

// ============================================
// Asset Types
// ============================================

export interface QualysAsset {
  id: string
  hostname: string
  ipAddress: string
  os?: string
  osVersion?: string
  type: string
  lastSeen: string
  tags?: string[]
  netbiosName?: string
  dnsName?: string
  agentId?: string
  vulnerabilityCount?: number
}

export interface QualysAssetListResponse {
  assets: QualysAsset[]
  total: number
  page: number
  limit: number
}

// ============================================
// Scan Types
// ============================================

export interface QualysScan {
  id: string
  scanRef: string
  title: string
  status: QualysScanStatus
  state?: string
  type: QualysScanType
  target?: string
  launchDatetime?: Date
  startDatetime?: Date
  endDatetime?: Date
  duration?: number
  processed?: number
  total?: number
  userLogin?: string
  // VM specific
  assetGroupTitle?: string
  assetGroupId?: string
  scannerApplianceType?: string
  // WAS specific
  wasScanId?: string
  wasScanType?: string
  webAppId?: string
  webAppName?: string
  webAppUrl?: string
  // Vulnerability counts
  totalVulnerabilities?: number
  criticalCount?: number
  highCount?: number
  mediumCount?: number
  lowCount?: number
  infoCount?: number
}

export interface QualysScanListResponse {
  scans: QualysScan[]
  total: number
}

// ============================================
// Scan Request/Response Types
// ============================================

export interface QualysLaunchScanParams {
  scanTitle: string
  optionTitle?: string
  optionId?: number
  ip?: string
  assetGroups?: string
  assetGroupIds?: string
  excludeIpPerScan?: string
  priority?: number
  iscannerName?: string
  iscannerId?: number
  defaultScanner?: number
}

export interface QualysLaunchScanResponse {
  scanRef: string
  scanTitle: string
  status: QualysScanStatus
  message?: string
}

export interface QualysScanStatusResponse {
  scanRef: string
  status: QualysScanStatus
  state: string
  processed: number
  total: number
  progress: number
  startDatetime?: Date
  endDatetime?: Date
  duration?: number
  userLogin?: string
}

export interface QualysFetchDetectionsParams {
  scanRef?: string
  assetId?: string
  ips?: string
  agIds?: string
  showIgs?: number
  status?: string
  severities?: string
}

export interface QualysFetchKBParams {
  qids: number[]
  details?: 'Basic' | 'All'
}

// ============================================
// Report Types
// ============================================

export interface QualysReport {
  id: string
  title: string
  type: string
  status: 'Finished' | 'Running' | 'Submitted' | 'Cancelled'
  createdAt: string
  size?: number
  format: 'PDF' | 'HTML' | 'XML' | 'CSV' | 'DOCX'
}

export interface QualysParsedReport {
  scanTitle: string
  scanDate?: Date
  hostsScanned: number
  totalVulnerabilities: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  infoCount: number
  vulnerabilities: QualysVulnerability[]
  hosts: QualysHostInfo[]
  warnings?: string[]  // API fallback or degraded mode warnings
}

export interface QualysHostInfo {
  id?: string
  ip?: string
  dns?: string
  netbios?: string
  os?: string
  trackingMethod?: string
  lastScanDatetime?: Date
  url?: string // For WAS
}

// ============================================
// Compliance Types
// ============================================

export interface QualysComplianceControl {
  id: string
  title: string
  status: 'Pass' | 'Fail' | 'Error' | 'Exception'
  severity: QualysSeverity
  standard: string
  section: string
  lastChecked: string
}

// ============================================
// Filter Types
// ============================================

export interface QualysVulnFilter {
  severity?: QualysSeverity[]
  status?: ('Active' | 'Fixed' | 'New' | 'Re-Opened')[]
  hostname?: string
  ipAddress?: string
  cve?: string
  page?: number
  limit?: number
}

export interface QualysAssetFilter {
  hostname?: string
  ipAddress?: string
  os?: string
  tags?: string[]
  page?: number
  limit?: number
}

export interface QualysScanFilter {
  status?: QualysScanStatus[]
  state?: string
  type?: QualysScanType
  scanRef?: string
  launchedAfterDatetime?: string
  launchedBeforeDatetime?: string
  page?: number
  limit?: number
}

// ============================================
// WAS Types
// ============================================

export interface QualysWASScan {
  id: string
  reference: string
  name: string
  type: string // VULNERABILITY, DISCOVERY
  status: string
  consolidatedStatus?: string
  target?: {
    webApp?: {
      id: string
      name: string
      url: string
    }
  }
  launchedDate?: Date
  launchedBy?: {
    username: string
  }
  summary?: {
    testDuration?: number
    nbRequests?: number
    linksCrawled?: number
  }
}

export interface QualysWASFinding {
  id: string
  uniqueId?: string
  qid: number
  name: string
  type: string
  severity: QualysSeverity
  status: string
  firstDetectedDate?: Date
  lastDetectedDate?: Date
  lastTestedDate?: Date
  potential?: boolean
  webApp?: {
    id: string
    name: string
    url: string
  }
}

export interface QualysWASFilter {
  status?: string
  webAppId?: number
  severity?: number
  qid?: number
}

// ============================================
// KB Types
// ============================================

export interface QualysKBEntry {
  qid: number
  title: string
  vulnType?: string
  severityLevel: number
  category?: string
  publishedDatetime?: string
  patchable: boolean
  diagnosis?: string
  consequence?: string
  solution?: string
  cvssBase?: number
  cvssTemporal?: number
  cvss3Base?: number
  cvss3Temporal?: number
  cveList: string[]
  vendorReferenceList: string[]
  bugtraqList: string[]
  pciFlag: boolean
  pciReasons: string[]
  exploitability?: string
  associatedMalware?: string
}

// ============================================
// API Response Types (Raw)
// ============================================

export interface QualysVulnListResponse {
  vulnerabilities: QualysVulnerability[]
  total: number
  page: number
  limit: number
}

export interface QualysAPIResponse<T> {
  success: boolean
  data?: T
  error?: string
  errorDescription?: string
}
