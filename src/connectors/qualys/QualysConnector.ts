// ============================================
// QUALYS CONNECTOR - Complyment Connectors SDK
// ============================================
// Enterprise Vulnerability Management Connector
// Supports VM (Vulnerability Management) and WAS (Web Application Scanning)
// Based on tested production code from qualys-integration-srv
// ============================================

import { BaseConnector } from '../../core/BaseConnector'
import {
  ConnectorConfig,
  ConnectorResponse,
  NormalizedVulnerability,
  NormalizedAsset,
  PaginatedResponse,
  AuthType,
  LogLevel,
} from '../../core/types'
import {
  QualysConfig,
  QualysAsset,
  QualysAssetFilter,
  QualysVulnerability,
  QualysVulnFilter,
  QualysScan,
  QualysScanFilter,
  QualysReport,
  QualysComplianceControl,
  QualysScanStatus,
  QualysScanType,
  QualysParsedReport,
  QualysLaunchScanParams,
  QualysLaunchScanResponse,
  QualysScanStatusResponse,
  QualysFetchDetectionsParams,
  QualysWASFilter,
  QualysKBEntry,
  isQualysScanTerminal,
  QualysSeverity,
} from './types'
import {
  QUALYS_VM_API_PATHS,
  QUALYS_WAS_API_PATHS,
  QUALYS_DEFAULTS,
  QUALYS_HEADERS,
  QUALYS_SEVERITY_MAP,
} from './constants'
import {
  parseHostDetections,
  parseVMDRFindings,
  emptyReport as emptyParsedReport,
  parseWASFindings,
  parseVulnerabilityKB,
  enrichVulnerabilitiesWithKB,
  parseVMScanList,
  parseWASScanList,
  parseScanStatusResponse,
  extractScanRefFromLaunchResponse,
} from './parser'

export class QualysConnector extends BaseConnector {
  private qualysConfig: QualysConfig

  constructor(qualysConfig: QualysConfig) {
    // Map QualysConfig → ConnectorConfig
    const config: ConnectorConfig = {
      name: 'qualys',
      baseUrl: qualysConfig.baseUrl,
      auth: {
        type: AuthType.BASIC,
        username: qualysConfig.username,
        password: qualysConfig.password,
      },
      timeout: qualysConfig.timeout ?? QUALYS_DEFAULTS.REQUEST_TIMEOUT_MS,
      retries: qualysConfig.retries ?? QUALYS_DEFAULTS.MAX_RETRIES,
      cache: qualysConfig.cache,
      dryRun: qualysConfig.dryRun,
      logger: LogLevel.INFO,
    }
    super(config)
    this.qualysConfig = qualysConfig
  }

  // ============================================
  // Auth - Basic Auth (handled by BaseConnector)
  // ============================================

  async authenticate(): Promise<void> {
    // Basic auth is injected automatically by BaseConnector
    // No token fetch needed
  }

  async testConnection(): Promise<boolean> {
    try {
      // Try to list scans with minimal request to verify connectivity
      await this.makeFormRequest(QUALYS_VM_API_PATHS.SCAN_LIST, { action: 'list' })
      return true
    } catch {
      return false
    }
  }

  // ============================================
  // VM Scan Operations (Production-tested)
  // ============================================

  /**
   * Launch a VM (Vulnerability Management) scan
   */
  async launchVMScan(params: QualysLaunchScanParams): Promise<ConnectorResponse<QualysLaunchScanResponse>> {
    const requestParams: Record<string, any> = {
      action: 'launch',
      scan_title: params.scanTitle,
    }

    if (params.optionTitle) requestParams.option_title = params.optionTitle
    if (params.optionId) requestParams.option_id = params.optionId
    if (params.ip) requestParams.ip = params.ip
    if (params.assetGroups) requestParams.asset_groups = params.assetGroups
    if (params.assetGroupIds) requestParams.asset_group_ids = params.assetGroupIds
    if (params.excludeIpPerScan) requestParams.exclude_ip_per_scan = params.excludeIpPerScan
    if (params.priority !== undefined) requestParams.priority = params.priority
    if (params.iscannerName) requestParams.iscanner_name = params.iscannerName
    if (params.iscannerId) requestParams.iscanner_id = params.iscannerId
    if (params.defaultScanner !== undefined) requestParams.default_scanner = params.defaultScanner

    const response = await this.makeFormRequest(QUALYS_VM_API_PATHS.SCAN_LAUNCH, requestParams)
    const scanRef = extractScanRefFromLaunchResponse(response)

    return {
      success: true,
      data: {
        scanRef,
        scanTitle: params.scanTitle,
        status: QualysScanStatus.SUBMITTED,
        message: 'Scan launched successfully',
      },
      timestamp: new Date(),
      connector: 'qualys',
    }
  }

  /**
   * Get scan status
   */
  async getVMScanStatus(scanRef: string): Promise<ConnectorResponse<QualysScanStatusResponse>> {
    const response = await this.makeFormRequest(QUALYS_VM_API_PATHS.SCAN_STATUS, {
      action: 'list',
      scan_ref: scanRef,
    })

    const scanInfo = parseScanStatusResponse(response, scanRef)
    const progress = scanInfo.total > 0
      ? Math.round((scanInfo.processed / scanInfo.total) * 100)
      : 0

    return {
      success: true,
      data: {
        scanRef,
        status: scanInfo.status,
        state: scanInfo.state,
        processed: scanInfo.processed,
        total: scanInfo.total,
        progress,
        startDatetime: scanInfo.startDatetime,
        duration: scanInfo.duration,
        userLogin: scanInfo.userLogin,
      },
      timestamp: new Date(),
      connector: 'qualys',
    }
  }

  /**
   * Cancel a running scan
   */
  async cancelVMScan(scanRef: string): Promise<ConnectorResponse<{ scanRef: string; message: string }>> {
    await this.makeFormRequest(QUALYS_VM_API_PATHS.SCAN_CANCEL, {
      action: 'cancel',
      scan_ref: scanRef,
    })

    return {
      success: true,
      data: {
        scanRef,
        message: 'Scan canceled successfully',
      },
      timestamp: new Date(),
      connector: 'qualys',
    }
  }

  /**
   * List VM scans
   */
  async listVMScans(filters?: QualysScanFilter): Promise<ConnectorResponse<{ scans: QualysScan[] }>> {
    // Try legacy VM API first
    try {
      const requestParams: Record<string, any> = { action: 'list' }

      if (filters?.state) requestParams.state = filters.state
      if (filters?.scanRef) requestParams.scan_ref = filters.scanRef
      if (filters?.launchedAfterDatetime) requestParams.launched_after_datetime = filters.launchedAfterDatetime
      if (filters?.launchedBeforeDatetime) requestParams.launched_before_datetime = filters.launchedBeforeDatetime

      const response = await this.get<any>(QUALYS_VM_API_PATHS.SCAN_LIST, requestParams)
      const scans = parseVMScanList(response.data)

      return {
        success: true,
        data: { scans },
        timestamp: new Date(),
        connector: 'qualys',
      }
    } catch (legacyError: any) {
      // Fallback to QPS API if legacy fails (401/403)
      const qpsResponse = await this.makeQPSRequest(QUALYS_VM_API_PATHS.QPS_HOST_ASSET, {
        limitResults: 100,
        filterCriteria: '<Criteria field="lastVulnScan" operator="GREATER">2000-01-01</Criteria>',
      })
      const scans = parseVMScanList(qpsResponse)
      return {
        success: true,
        data: { scans },
        timestamp: new Date(),
        connector: 'qualys',
      }
    }
  }

  // ============================================
  // Host Detections / Vulnerabilities (Production-tested)
  // ============================================

  /**
   * Fetch host detections (vulnerabilities) from Qualys
   * Uses hybrid approach: QPS API for asset_id, Legacy API for scan_ref
   */
  async fetchHostDetections(params: QualysFetchDetectionsParams): Promise<ConnectorResponse<QualysParsedReport>> {
    const requiresLegacyAPI = params.scanRef !== undefined
    const requiresQPSAPI = params.assetId !== undefined

    // Try QPS API if asset_id is provided or no scan_ref
    if (requiresQPSAPI || !requiresLegacyAPI) {
      try {
        let filterCriteria = '<Criteria field="vulnerabilityCount" operator="GREATER">0</Criteria>'
        if (params.assetId) {
          filterCriteria = `<Criteria field="id" operator="EQUALS">${params.assetId}</Criteria>`
        }

        const response = await this.makeQPSRequest(QUALYS_VM_API_PATHS.QPS_HOST_ASSET, {
          limitResults: 100,
          filterCriteria,
        })

        const parsed = parseHostDetections(response, 'Host Detections')
        return {
          success: true,
          data: parsed,
          timestamp: new Date(),
          connector: 'qualys',
        }
      } catch (qpsError: any) {
        if (requiresQPSAPI) throw qpsError
        // Log and fall through to legacy API
        this.log(LogLevel.DEBUG, 'QPS API unavailable, falling back to VMDR/legacy API', { error: qpsError?.message })
      }
    }

    // Try VMDR REST API (works for VMDR-only subscriptions, no classic VM module needed)
    try {
      const vmdrParams: Record<string, any> = {
        pageNo: 0,
        pageSize: QUALYS_DEFAULTS.TRUNCATION_LIMIT,
      }

      // Map legacy filter fields to VMDR query params
      if (params.severities) vmdrParams.severities = params.severities
      if (params.status) vmdrParams.filter = `status:${params.status}`
      if (params.ips) vmdrParams.hostIp = params.ips

      const vmdrResponse = await this.get<any>(QUALYS_VM_API_PATHS.VMDR_FINDINGS, vmdrParams)
      const vmdrData = vmdrResponse.data ?? vmdrResponse

      // Only use VMDR response if it has a recognisable success structure
      if (vmdrData?.responseCode === 'SUCCESS' || Array.isArray(vmdrData?.data)) {
        const parsed = parseVMDRFindings(vmdrData, 'VMDR Findings')
        return {
          success: true,
          data: parsed,
          timestamp: new Date(),
          connector: 'qualys',
        }
      }
    } catch (vmdrError: any) {
      // VMDR API unavailable — fall through to classic VM detection API
      this.log(LogLevel.DEBUG, 'VMDR API unavailable, falling back to legacy VM API', { error: vmdrError?.message })
    }

    // Use legacy HOST_DETECTIONS API (requires classic VM module subscription)
    try {
      const requestParams: Record<string, any> = {
        action: 'list',
        truncation_limit: QUALYS_DEFAULTS.TRUNCATION_LIMIT,
      }

      if (params.scanRef) requestParams.scan_ref = params.scanRef
      if (params.ips) requestParams.ips = params.ips
      if (params.agIds) requestParams.ag_ids = params.agIds
      if (params.showIgs !== undefined) requestParams.show_igs = params.showIgs
      if (params.status) requestParams.status = params.status
      if (params.severities) requestParams.severities = params.severities

      const response = await this.makeFormRequest(QUALYS_VM_API_PATHS.HOST_DETECTIONS, requestParams)
      const parsed = parseHostDetections(response, params.scanRef || 'Host Detections')

      return {
        success: true,
        data: parsed,
        timestamp: new Date(),
        connector: 'qualys',
      }
    } catch (legacyError: any) {
      // Classic VM module not available (VMDR-only subscription) — return empty result with warning
      this.log(LogLevel.WARN, 'All Qualys APIs failed, returning empty result', { error: legacyError?.message })
      const emptyResult = emptyParsedReport('Host Detections')
      return {
        success: true,
        data: {
          ...emptyResult,
          warnings: [...(emptyResult.warnings || []), 'No detection APIs available - QPS, VMDR, and legacy VM APIs all failed'],
        },
        timestamp: new Date(),
        connector: 'qualys',
      }
    }
  }

  /**
   * Fetch vulnerability knowledge base data
   */
  async fetchVulnerabilityKB(qids: number[]): Promise<ConnectorResponse<Map<number, QualysKBEntry>>> {
    try {
      const limitedQids = qids.slice(0, QUALYS_DEFAULTS.KB_FETCH_LIMIT)

      const response = await this.makeFormRequest(QUALYS_VM_API_PATHS.VULN_KB, {
        action: 'list',
        ids: limitedQids.join(','),
        details: 'All',
      })

      const kbMap = parseVulnerabilityKB(response)
      return {
        success: true,
        data: kbMap,
        timestamp: new Date(),
        connector: 'qualys',
      }
    } catch (error: any) {
      // KB API may return 401 if user doesn't have permissions - return empty map with warning
      this.log(LogLevel.WARN, 'KB API unavailable, returning empty knowledge base', { error: error?.message })
      return {
        success: true,
        data: new Map(),
        error: `KB API unavailable: ${error?.message || 'Unknown error'}`,
        timestamp: new Date(),
        connector: 'qualys',
      }
    }
  }

  // ============================================
  // WAS (Web Application Scanning) Operations
  // ============================================

  /**
   * List WAS scans
   */
  async listWASScans(filters?: QualysWASFilter): Promise<ConnectorResponse<{ scans: QualysScan[] }>> {
    let filterXml = ''
    if (filters && Object.keys(filters).length > 0) {
      filterXml = '<filters>' +
        Object.entries(filters).map(([key, value]) =>
          `<Criteria field="${key}" operator="EQUALS">${value}</Criteria>`
        ).join('') +
        '</filters>'
    }

    const response = await this.makeWASRequest(QUALYS_WAS_API_PATHS.WAS_SCAN_LIST, filterXml)
    const scans = parseWASScanList(response)

    return {
      success: true,
      data: { scans },
      timestamp: new Date(),
      connector: 'qualys',
    }
  }

  /**
   * List WAS findings (vulnerabilities)
   */
  async listWASFindings(filters?: QualysWASFilter): Promise<ConnectorResponse<QualysParsedReport>> {
    let filterXml = ''
    if (filters && Object.keys(filters).length > 0) {
      const criteriaElements = Object.entries(filters).map(([key, value]) => {
        const field = key === 'webAppId' ? 'webApp.id' : key
        return `<Criteria field="${field}" operator="EQUALS">${value}</Criteria>`
      }).join('')
      filterXml = `<filters>${criteriaElements}</filters>`
    }

    const response = await this.makeWASRequest(QUALYS_WAS_API_PATHS.WAS_FINDINGS, filterXml)
    const parsed = parseWASFindings(response, 'WAS Findings')

    return {
      success: true,
      data: parsed,
      timestamp: new Date(),
      connector: 'qualys',
    }
  }

  // ============================================
  // High-Level Operations
  // ============================================

  /**
   * Get scan results with KB enrichment
   */
  async getScanResults(scanRef: string, enrichWithKB = true): Promise<ConnectorResponse<QualysParsedReport>> {
    const detectionsResponse = await this.fetchHostDetections({
      scanRef,
      showIgs: 0,
    })

    if (!detectionsResponse.success || !detectionsResponse.data) {
      return {
        success: false,
        data: undefined,
        error: 'Failed to fetch detections',
        timestamp: new Date(),
        connector: 'qualys',
      }
    }

    let report = detectionsResponse.data

    // Enrich with KB data if requested
    if (enrichWithKB && report.vulnerabilities.length > 0) {
      const uniqueQIDs = [...new Set(report.vulnerabilities.map(v => v.qid))]
      const kbResponse = await this.fetchVulnerabilityKB(uniqueQIDs)

      if (kbResponse.success && kbResponse.data && kbResponse.data.size > 0) {
        report = {
          ...report,
          vulnerabilities: enrichVulnerabilitiesWithKB(report.vulnerabilities, kbResponse.data),
        }
      }
    }

    return {
      success: true,
      data: report,
      timestamp: new Date(),
      connector: 'qualys',
    }
  }

  /**
   * Poll scan until completion
   */
  async pollScanUntilComplete(
    scanRef: string,
    options?: {
      pollIntervalMs?: number
      maxAttempts?: number
      onProgress?: (status: QualysScanStatusResponse) => void
    }
  ): Promise<ConnectorResponse<QualysScanStatusResponse>> {
    const pollInterval = options?.pollIntervalMs || QUALYS_DEFAULTS.POLL_INTERVAL_MS
    const maxAttempts = options?.maxAttempts || QUALYS_DEFAULTS.MAX_POLL_ATTEMPTS

    let attempts = 0

    while (attempts < maxAttempts) {
      const statusResponse = await this.getVMScanStatus(scanRef)

      if (!statusResponse.success || !statusResponse.data) {
        return {
          success: false,
          data: undefined,
          error: 'Failed to get scan status during polling',
          timestamp: new Date(),
          connector: 'qualys',
        }
      }

      const status = statusResponse.data

      // Call progress callback if provided
      if (options?.onProgress) {
        options.onProgress(status)
      }

      // Check if scan is complete
      if (isQualysScanTerminal(status.status)) {
        return statusResponse
      }

      // Wait before next poll
      await this.delay(pollInterval)
      attempts++
    }

    return {
      success: false,
      data: undefined,
      error: `Scan polling exceeded max attempts (${maxAttempts})`,
      timestamp: new Date(),
      connector: 'qualys',
    }
  }

  /**
   * Trigger scan and wait for results
   */
  async triggerScanAndWait(
    params: QualysLaunchScanParams,
    options?: {
      pollIntervalMs?: number
      maxAttempts?: number
      enrichWithKB?: boolean
      onProgress?: (status: QualysScanStatusResponse) => void
    }
  ): Promise<ConnectorResponse<QualysParsedReport>> {
    // Launch scan
    const launchResponse = await this.launchVMScan(params)
    if (!launchResponse.success || !launchResponse.data) {
      return {
        success: false,
        data: undefined,
        error: 'Failed to launch scan',
        timestamp: new Date(),
        connector: 'qualys',
      }
    }

    const { scanRef } = launchResponse.data

    // Poll until complete
    const finalStatus = await this.pollScanUntilComplete(scanRef, {
      pollIntervalMs: options?.pollIntervalMs,
      maxAttempts: options?.maxAttempts,
      onProgress: options?.onProgress,
    })

    if (!finalStatus.success || finalStatus.data?.status !== QualysScanStatus.FINISHED) {
      return {
        success: false,
        data: undefined,
        error: `Scan did not complete successfully: ${finalStatus.data?.status || 'Unknown'}`,
        timestamp: new Date(),
        connector: 'qualys',
      }
    }

    // Get results
    return this.getScanResults(scanRef, options?.enrichWithKB ?? true)
  }

  // ============================================
  // Asset Management (Original + Enhanced)
  // ============================================

  async getAssets(
    filter?: QualysAssetFilter,
  ): Promise<ConnectorResponse<PaginatedResponse<QualysAsset>>> {
    try {
      const response = await this.makeQPSRequest(QUALYS_VM_API_PATHS.QPS_HOST_ASSET, {
        limitResults: filter?.limit || 100,
        filterCriteria: '',
      })

      const serviceResponse = response?.ServiceResponse
      const hostAssets = serviceResponse?.data || []

      const assets: QualysAsset[] = hostAssets.map((item: any) => {
        const asset = item.HostAsset || item
        return {
          id: asset.id || '',
          hostname: asset.name || asset.hostname || '',
          ipAddress: asset.address || asset.ip || '',
          os: asset.os || asset.operatingSystem || '',
          type: 'Host',
          lastSeen: asset.lastVulnScan || asset.vulnsUpdated || '',
          vulnerabilityCount: asset.vulnerabilityStats?.count || asset.vulnCount || 0,
        }
      })

      const paginated = this.buildPaginatedResponse(
        assets,
        assets.length,
        { page: filter?.page, limit: filter?.limit },
      )

      return {
        success: true,
        data: paginated,
        timestamp: new Date(),
        connector: 'qualys',
      }
    } catch (error: any) {
      return {
        success: false,
        data: undefined,
        error: error.message,
        timestamp: new Date(),
        connector: 'qualys',
      }
    }
  }

  async getAssetById(assetId: string): Promise<ConnectorResponse<QualysAsset>> {
    const response = await this.makeQPSRequest(QUALYS_VM_API_PATHS.QPS_HOST_ASSET, {
      limitResults: 1,
      filterCriteria: `<Criteria field="id" operator="EQUALS">${assetId}</Criteria>`,
    })

    const serviceResponse = response?.ServiceResponse
    const hostAssets = serviceResponse?.data || []

    if (hostAssets.length === 0) {
      return {
        success: false,
        data: undefined,
        error: 'Asset not found',
        timestamp: new Date(),
        connector: 'qualys',
      }
    }

    const asset = hostAssets[0].HostAsset || hostAssets[0]
    return {
      success: true,
      data: {
        id: asset.id || '',
        hostname: asset.name || asset.hostname || '',
        ipAddress: asset.address || asset.ip || '',
        os: asset.os || asset.operatingSystem || '',
        type: 'Host',
        lastSeen: asset.lastVulnScan || asset.vulnsUpdated || '',
        vulnerabilityCount: asset.vulnerabilityStats?.count || asset.vulnCount || 0,
      },
      timestamp: new Date(),
      connector: 'qualys',
    }
  }

  // ============================================
  // Vulnerability Management (Original + Enhanced)
  // ============================================

  async getVulnerabilities(
    filter?: QualysVulnFilter,
  ): Promise<ConnectorResponse<PaginatedResponse<QualysVulnerability>>> {
    const detectionsParams: QualysFetchDetectionsParams = {}

    if (filter?.severity?.length) detectionsParams.severities = filter.severity.join(',')
    if (filter?.status?.length) detectionsParams.status = filter.status.join(',')
    if (filter?.ipAddress) detectionsParams.ips = filter.ipAddress

    const response = await this.fetchHostDetections(detectionsParams)

    if (!response.success || !response.data) {
      return {
        success: false,
        data: undefined,
        error: response.error || 'Failed to fetch vulnerabilities',
        timestamp: new Date(),
        connector: 'qualys',
      }
    }

    const paginated = this.buildPaginatedResponse(
      response.data.vulnerabilities,
      response.data.totalVulnerabilities,
      { page: filter?.page, limit: filter?.limit },
    )

    return {
      success: true,
      data: paginated,
      timestamp: new Date(),
      connector: 'qualys',
    }
  }

  async getCriticalVulnerabilities(): Promise<ConnectorResponse<PaginatedResponse<QualysVulnerability>>> {
    return this.getVulnerabilities({
      severity: [4, 5] as QualysSeverity[],
      status: ['Active', 'New'],
    })
  }

  // ============================================
  // Scan Management (Original - using new methods)
  // ============================================

  async getScans(
    filter?: QualysScanFilter,
  ): Promise<ConnectorResponse<PaginatedResponse<QualysScan>>> {
    const response = await this.listVMScans(filter)

    if (!response.success || !response.data) {
      return {
        success: false,
        data: undefined,
        error: response.error || 'Failed to list scans',
        timestamp: new Date(),
        connector: 'qualys',
      }
    }

    const paginated = this.buildPaginatedResponse(
      response.data.scans,
      response.data.scans.length,
      { page: filter?.page, limit: filter?.limit },
    )

    return {
      success: true,
      data: paginated,
      timestamp: new Date(),
      connector: 'qualys',
    }
  }

  async launchScan(
    title: string,
    targetHosts: string[],
    optionProfileId: string,
  ): Promise<ConnectorResponse<QualysScan>> {
    // Validate optionProfileId is a valid number
    const optionId = parseInt(optionProfileId, 10)
    if (isNaN(optionId)) {
      return {
        success: false,
        data: undefined,
        error: `Invalid optionProfileId: "${optionProfileId}" is not a valid number`,
        timestamp: new Date(),
        connector: 'qualys',
      }
    }

    const response = await this.launchVMScan({
      scanTitle: title,
      ip: targetHosts.join(','),
      optionId,
    })

    if (!response.success || !response.data) {
      return {
        success: false,
        data: undefined,
        error: response.error || 'Failed to launch scan',
        timestamp: new Date(),
        connector: 'qualys',
      }
    }

    return {
      success: true,
      data: {
        id: response.data.scanRef,
        scanRef: response.data.scanRef,
        title: response.data.scanTitle,
        status: response.data.status,
        type: QualysScanType.VM,
        target: targetHosts.join(','),
      },
      timestamp: new Date(),
      connector: 'qualys',
    }
  }

  async cancelScan(scanId: string): Promise<ConnectorResponse<void>> {
    const response = await this.cancelVMScan(scanId)
    return {
      success: response.success,
      data: undefined,
      error: response.error,
      timestamp: new Date(),
      connector: 'qualys',
    }
  }

  // ============================================
  // Reports (Original)
  // ============================================

  async getReports(): Promise<ConnectorResponse<QualysReport[]>> {
    return this.get<QualysReport[]>('/api/2.0/fo/report/', { action: 'list' })
  }

  async downloadReport(reportId: string): Promise<ConnectorResponse<Buffer>> {
    return this.get<Buffer>('/api/2.0/fo/report/', {
      action: 'fetch',
      id: reportId,
    })
  }

  // ============================================
  // Compliance (Original)
  // ============================================

  async getComplianceControls(): Promise<ConnectorResponse<QualysComplianceControl[]>> {
    return this.get<QualysComplianceControl[]>('/api/2.0/fo/compliance/control/', { action: 'list' })
  }

  // ============================================
  // Normalization - Maps to SDK standard format
  // ============================================

  async getNormalizedVulnerabilities(
    filter?: QualysVulnFilter,
  ): Promise<ConnectorResponse<NormalizedVulnerability[]>> {
    const response = await this.getVulnerabilities(filter)

    if (!response.data) {
      return { ...response, data: [] }
    }

    const normalized: NormalizedVulnerability[] = response.data.data.map(
      (vuln) => ({
        id: String(vuln.qid),
        title: vuln.title,
        severity: this.mapSeverity(vuln.severity),
        cvss: vuln.cvss3Base ?? vuln.cvssBase,
        cve: vuln.cveList?.[0],
        affectedAsset: vuln.dns ?? vuln.ip ?? 'unknown',
        source: 'qualys',
        detectedAt: vuln.firstFound ? new Date(vuln.firstFound) : new Date(),
        raw: vuln,
      }),
    )

    return { ...response, data: normalized }
  }

  async getNormalizedAssets(
    filter?: QualysAssetFilter,
  ): Promise<ConnectorResponse<NormalizedAsset[]>> {
    const response = await this.getAssets(filter)

    if (!response.data) {
      return { ...response, data: [] }
    }

    const normalized: NormalizedAsset[] = response.data.data.map((asset) => ({
      id: asset.id,
      hostname: asset.hostname,
      ipAddress: asset.ipAddress,
      os: asset.os,
      type: 'server',
      source: 'qualys',
      lastSeen: new Date(asset.lastSeen),
      raw: asset,
    }))

    return { ...response, data: normalized }
  }

  // ============================================
  // Private HTTP Methods (Form-encoded for Qualys)
  // ============================================

  private async makeFormRequest(endpoint: string, params: Record<string, any>): Promise<any> {
    // Convert params to form-urlencoded
    const formData = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&')

    const response = await this.postRaw<any>(endpoint, formData, {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...QUALYS_HEADERS.DEFAULT,
    })

    return response.data
  }

  private async makeQPSRequest(endpoint: string, options: {
    limitResults?: number
    filterCriteria?: string
  }): Promise<any> {
    const xmlBody = `<ServiceRequest>
      <preferences>
        <limitResults>${options.limitResults || 100}</limitResults>
      </preferences>
      <filters>
        ${options.filterCriteria || ''}
      </filters>
    </ServiceRequest>`

    const response = await this.postRaw<any>(endpoint, xmlBody, {
      'Content-Type': 'text/xml',
      'Accept': 'application/json',
      ...QUALYS_HEADERS.DEFAULT,
    })

    return response.data
  }

  private async makeWASRequest(endpoint: string, filterXml: string = ''): Promise<any> {
    const xmlBody = `<ServiceRequest>${filterXml}</ServiceRequest>`

    const response = await this.postRaw<any>(endpoint, xmlBody, {
      'Content-Type': 'text/xml',
      'Accept': 'application/json',
      ...QUALYS_HEADERS.DEFAULT,
    })

    return response.data
  }

  // Post with raw body and custom headers
  private async postRaw<T>(url: string, body: string, headers: Record<string, string>): Promise<ConnectorResponse<T>> {
    // Use the base post method but we need to handle custom headers
    // For now, use the httpClient directly
    const httpClient = (this as any).httpClient
    const response = await httpClient.post(url, body, { headers })
    return {
      success: true,
      data: response.data as T,
      statusCode: response.status,
      timestamp: new Date(),
      connector: 'qualys',
    }
  }

  // ============================================
  // Private Helpers
  // ============================================

  private mapSeverity(
    severity: QualysSeverity,
  ): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    const map = {
      5: 'critical',
      4: 'high',
      3: 'medium',
      2: 'low',
      1: 'info',
    } as const
    return map[severity]
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
