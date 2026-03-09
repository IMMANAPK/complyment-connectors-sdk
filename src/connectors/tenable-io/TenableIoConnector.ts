// ============================================
// TENABLE.IO CONNECTOR - Complyment Connectors SDK
// ============================================
// Cloud-based Vulnerability Management Connector
// Supports Assets, Vulnerabilities, Scans, Users, Agents, Scanners
// ============================================

import { BaseConnector } from '../../core/BaseConnector'
import {
  ConnectorConfig,
  ConnectorResponse,
  AuthType,
  LogLevel,
} from '../../core/types'
import {
  TenableIoConfig,
  TenableIoAsset,
  TenableIoAssetsResponse,
  TenableIoVulnerability,
  TenableIoScan,
  TenableIoScansResponse,
  TenableIoUser,
  TenableIoUsersResponse,
  TenableIoAgent,
  TenableIoAgentsResponse,
  TenableIoScanner,
  TenableIoScannersResponse,
  TenableIoServerInfo,
  TenableIoServerStatus,
  TenableIoExportJob,
  TenableIoExportStatusResponse,
  TenableIoLaunchScanResponse,
  TenableIoStats,
  WorkbenchVulnerabilitiesResponse,
  WorkbenchAssetsResponse,
  WorkbenchVulnInfoResponse,
  WorkbenchAssetInfoResponse,
  WorkbenchAssetVulnsResponse,
  ExportAssetsFilter,
  ExportVulnerabilitiesFilter,
  TenableIoGetScansFilter,
  GetAgentsFilter,
  GetWorkbenchVulnsFilter,
  GetWorkbenchAssetsFilter,
} from './types'
import {
  TENABLE_IO_API_PATHS,
  TENABLE_IO_DEFAULTS,
  TENABLE_IO_SEVERITY_MAP,
  isExportComplete,
  isExportSuccess,
} from './constants'

export class TenableIoConnector extends BaseConnector {
  private tenableConfig: TenableIoConfig

  constructor(tenableConfig: TenableIoConfig) {
    const config: ConnectorConfig = {
      name: 'tenable-io',
      baseUrl: tenableConfig.baseUrl ?? TENABLE_IO_DEFAULTS.BASE_URL,
      auth: {
        type: AuthType.API_KEY,
        apiKey: `accessKey=${tenableConfig.accessKey}; secretKey=${tenableConfig.secretKey}`,
        headerName: 'X-ApiKeys',
      },
      timeout: tenableConfig.timeout ?? TENABLE_IO_DEFAULTS.TIMEOUT_MS,
      retries: tenableConfig.retries ?? TENABLE_IO_DEFAULTS.MAX_RETRIES,
      rateLimit: {
        requests: TENABLE_IO_DEFAULTS.RATE_LIMIT_REQUESTS,
        perSeconds: TENABLE_IO_DEFAULTS.RATE_LIMIT_WINDOW_SECONDS,
      },
      cache: tenableConfig.cache,
      dryRun: tenableConfig.dryRun,
      logger: LogLevel.INFO,
    }
    super(config)
    this.tenableConfig = tenableConfig
  }

  // ============================================
  // Auth (API Key handled by BaseConnector)
  // ============================================

  async authenticate(): Promise<void> {
    // API Key auth is injected automatically by BaseConnector
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.get<TenableIoServerInfo>(TENABLE_IO_API_PATHS.SERVER_PROPERTIES)
      return response.success
    } catch {
      return false
    }
  }

  // ============================================
  // Server Operations
  // ============================================

  async getServerInfo(): Promise<ConnectorResponse<TenableIoServerInfo>> {
    return this.get<TenableIoServerInfo>(TENABLE_IO_API_PATHS.SERVER_PROPERTIES)
  }

  async getServerStatus(): Promise<ConnectorResponse<TenableIoServerStatus>> {
    return this.get<TenableIoServerStatus>(TENABLE_IO_API_PATHS.SERVER_STATUS)
  }

  // ============================================
  // Asset Operations
  // ============================================

  /**
   * Get assets (up to 5000 - for larger datasets use exportAssets)
   */
  async getAssets(): Promise<ConnectorResponse<TenableIoAssetsResponse>> {
    return this.get<TenableIoAssetsResponse>(TENABLE_IO_API_PATHS.ASSETS)
  }

  /**
   * Get asset by UUID
   */
  async getAssetById(assetUuid: string): Promise<ConnectorResponse<TenableIoAsset>> {
    return this.get<TenableIoAsset>(TENABLE_IO_API_PATHS.ASSET_BY_ID(assetUuid))
  }

  /**
   * Start asset export job (async - for large datasets)
   */
  async exportAssets(filters: ExportAssetsFilter = {}): Promise<ConnectorResponse<TenableIoExportJob>> {
    const requestBody: Record<string, unknown> = {}

    if (filters.chunk_size) requestBody.chunk_size = filters.chunk_size

    const filterParams: Record<string, unknown> = {}
    if (filters.created_at) filterParams.created_at = filters.created_at
    if (filters.updated_at) filterParams.updated_at = filters.updated_at
    if (filters.terminated_at) filterParams.terminated_at = filters.terminated_at
    if (filters.deleted_at) filterParams.deleted_at = filters.deleted_at
    if (filters.first_scan_time) filterParams.first_scan_time = filters.first_scan_time
    if (filters.last_authenticated_scan_time) filterParams.last_authenticated_scan_time = filters.last_authenticated_scan_time
    if (filters.last_assessed) filterParams.last_assessed = filters.last_assessed
    if (filters.servicenow_sysid !== undefined) filterParams.servicenow_sysid = filters.servicenow_sysid
    if (filters.sources) filterParams.sources = filters.sources
    if (filters.has_plugin_results !== undefined) filterParams.has_plugin_results = filters.has_plugin_results
    if (filters.tag_category && filters.tag_value) {
      filterParams.tag = { category: filters.tag_category, value: filters.tag_value }
    }

    if (Object.keys(filterParams).length > 0) {
      requestBody.filters = filterParams
    }

    const response = await this.post<{ export_uuid: string }>(TENABLE_IO_API_PATHS.ASSETS_EXPORT, requestBody)

    return {
      ...response,
      data: response.data ? { uuid: response.data.export_uuid } : undefined,
    }
  }

  /**
   * Get asset export status
   */
  async getAssetExportStatus(exportUuid: string): Promise<ConnectorResponse<TenableIoExportStatusResponse>> {
    return this.get<TenableIoExportStatusResponse>(TENABLE_IO_API_PATHS.ASSETS_EXPORT_STATUS(exportUuid))
  }

  /**
   * Download asset export chunk
   */
  async downloadAssetExportChunk(exportUuid: string, chunkId: number): Promise<ConnectorResponse<TenableIoAsset[]>> {
    return this.get<TenableIoAsset[]>(TENABLE_IO_API_PATHS.ASSETS_EXPORT_CHUNK(exportUuid, chunkId))
  }

  /**
   * Export and retrieve all assets (polls until complete)
   */
  async exportAssetsComplete(
    filters: ExportAssetsFilter = {},
    pollIntervalMs = TENABLE_IO_DEFAULTS.EXPORT_POLL_INTERVAL_MS,
    maxWaitMs = TENABLE_IO_DEFAULTS.EXPORT_MAX_WAIT_MS,
  ): Promise<ConnectorResponse<TenableIoAsset[]>> {
    // Start export
    const exportResponse = await this.exportAssets(filters)
    if (!exportResponse.success || !exportResponse.data?.uuid) {
      return {
        success: false,
        error: 'Failed to start asset export',
        timestamp: new Date(),
        connector: 'tenable-io',
      }
    }

    const exportUuid = exportResponse.data.uuid
    const startTime = Date.now()

    // Poll for completion
    while (Date.now() - startTime < maxWaitMs) {
      const statusResponse = await this.getAssetExportStatus(exportUuid)
      if (!statusResponse.success || !statusResponse.data) {
        return {
          success: false,
          error: 'Failed to get export status',
          timestamp: new Date(),
          connector: 'tenable-io',
        }
      }

      const status = statusResponse.data.status
      if (isExportComplete(status)) {
        if (!isExportSuccess(status)) {
          return {
            success: false,
            error: `Export failed with status: ${status}`,
            timestamp: new Date(),
            connector: 'tenable-io',
          }
        }

        // Download all chunks
        const allAssets: TenableIoAsset[] = []
        const chunks = statusResponse.data.chunks_available || []

        for (const chunkId of chunks) {
          const chunkResponse = await this.downloadAssetExportChunk(exportUuid, chunkId)
          if (chunkResponse.success && chunkResponse.data) {
            allAssets.push(...chunkResponse.data)
          }
        }

        return {
          success: true,
          data: allAssets,
          timestamp: new Date(),
          connector: 'tenable-io',
        }
      }

      await this.sleep(pollIntervalMs)
    }

    return {
      success: false,
      error: 'Export timed out',
      timestamp: new Date(),
      connector: 'tenable-io',
    }
  }

  // ============================================
  // Vulnerability Operations
  // ============================================

  /**
   * Start vulnerability export job
   */
  async exportVulnerabilities(filters: ExportVulnerabilitiesFilter = {}): Promise<ConnectorResponse<TenableIoExportJob>> {
    const requestBody: Record<string, unknown> = {}

    if (filters.num_assets) requestBody.num_assets = filters.num_assets

    const filterParams: Record<string, unknown> = {}
    if (filters.severity && filters.severity.length > 0) filterParams.severity = filters.severity
    if (filters.state && filters.state.length > 0) filterParams.state = filters.state
    if (filters.plugin_family && filters.plugin_family.length > 0) filterParams.plugin_family = filters.plugin_family
    if (filters.since) filterParams.since = filters.since
    if (filters.cidr_range) filterParams.cidr_range = filters.cidr_range
    if (filters.first_found) filterParams.first_found = filters.first_found
    if (filters.last_found) filterParams.last_found = filters.last_found
    if (filters.last_fixed) filterParams.last_fixed = filters.last_fixed

    if (Object.keys(filterParams).length > 0) {
      requestBody.filters = filterParams
    }

    const response = await this.post<{ export_uuid: string }>(TENABLE_IO_API_PATHS.VULNS_EXPORT, requestBody)

    return {
      ...response,
      data: response.data ? { uuid: response.data.export_uuid } : undefined,
    }
  }

  /**
   * Get vulnerability export status
   */
  async getVulnExportStatus(exportUuid: string): Promise<ConnectorResponse<TenableIoExportStatusResponse>> {
    return this.get<TenableIoExportStatusResponse>(TENABLE_IO_API_PATHS.VULNS_EXPORT_STATUS(exportUuid))
  }

  /**
   * Download vulnerability export chunk
   */
  async downloadVulnExportChunk(exportUuid: string, chunkId: number): Promise<ConnectorResponse<TenableIoVulnerability[]>> {
    return this.get<TenableIoVulnerability[]>(TENABLE_IO_API_PATHS.VULNS_EXPORT_CHUNK(exportUuid, chunkId))
  }

  /**
   * Cancel vulnerability export
   */
  async cancelVulnExport(exportUuid: string): Promise<ConnectorResponse<{ status: string }>> {
    return this.post<{ status: string }>(TENABLE_IO_API_PATHS.VULNS_EXPORT_CANCEL(exportUuid))
  }

  /**
   * Export and retrieve all vulnerabilities (polls until complete)
   */
  async exportVulnerabilitiesComplete(
    filters: ExportVulnerabilitiesFilter = {},
    pollIntervalMs = TENABLE_IO_DEFAULTS.EXPORT_POLL_INTERVAL_MS,
    maxWaitMs = TENABLE_IO_DEFAULTS.EXPORT_MAX_WAIT_MS,
  ): Promise<ConnectorResponse<TenableIoVulnerability[]>> {
    const exportResponse = await this.exportVulnerabilities(filters)
    if (!exportResponse.success || !exportResponse.data?.uuid) {
      return {
        success: false,
        error: 'Failed to start vulnerability export',
        timestamp: new Date(),
        connector: 'tenable-io',
      }
    }

    const exportUuid = exportResponse.data.uuid
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitMs) {
      const statusResponse = await this.getVulnExportStatus(exportUuid)
      if (!statusResponse.success || !statusResponse.data) {
        return {
          success: false,
          error: 'Failed to get export status',
          timestamp: new Date(),
          connector: 'tenable-io',
        }
      }

      const status = statusResponse.data.status
      if (isExportComplete(status)) {
        if (!isExportSuccess(status)) {
          return {
            success: false,
            error: `Export failed with status: ${status}`,
            timestamp: new Date(),
            connector: 'tenable-io',
          }
        }

        const allVulns: TenableIoVulnerability[] = []
        const chunks = statusResponse.data.chunks_available || []

        for (const chunkId of chunks) {
          const chunkResponse = await this.downloadVulnExportChunk(exportUuid, chunkId)
          if (chunkResponse.success && chunkResponse.data) {
            allVulns.push(...chunkResponse.data)
          }
        }

        return {
          success: true,
          data: allVulns,
          timestamp: new Date(),
          connector: 'tenable-io',
        }
      }

      await this.sleep(pollIntervalMs)
    }

    return {
      success: false,
      error: 'Export timed out',
      timestamp: new Date(),
      connector: 'tenable-io',
    }
  }

  // ============================================
  // Scan Operations
  // ============================================

  /**
   * Get scans
   */
  async getScans(filters: TenableIoGetScansFilter = {}): Promise<ConnectorResponse<TenableIoScansResponse>> {
    const params: Record<string, unknown> = {}
    if (filters.folder_id) params.folder_id = filters.folder_id
    if (filters.last_modification_date) params.last_modification_date = filters.last_modification_date

    return this.get<TenableIoScansResponse>(TENABLE_IO_API_PATHS.SCANS, params)
  }

  /**
   * Get scan by ID
   */
  async getScanById(scanId: string): Promise<ConnectorResponse<TenableIoScan>> {
    return this.get<TenableIoScan>(TENABLE_IO_API_PATHS.SCAN_BY_ID(scanId))
  }

  /**
   * Launch scan
   */
  async launchScan(scanId: string, altTargets?: string[]): Promise<ConnectorResponse<TenableIoLaunchScanResponse>> {
    const requestBody: Record<string, unknown> = {}
    if (altTargets && altTargets.length > 0) {
      requestBody.alt_targets = altTargets
    }
    return this.post<TenableIoLaunchScanResponse>(TENABLE_IO_API_PATHS.SCAN_LAUNCH(scanId), requestBody)
  }

  /**
   * Pause scan
   */
  async pauseScan(scanId: string): Promise<ConnectorResponse<void>> {
    return this.post<void>(TENABLE_IO_API_PATHS.SCAN_PAUSE(scanId))
  }

  /**
   * Resume scan
   */
  async resumeScan(scanId: string): Promise<ConnectorResponse<void>> {
    return this.post<void>(TENABLE_IO_API_PATHS.SCAN_RESUME(scanId))
  }

  /**
   * Stop scan
   */
  async stopScan(scanId: string): Promise<ConnectorResponse<void>> {
    return this.post<void>(TENABLE_IO_API_PATHS.SCAN_STOP(scanId))
  }

  // ============================================
  // User Operations
  // ============================================

  /**
   * Get users
   */
  async getUsers(): Promise<ConnectorResponse<TenableIoUsersResponse>> {
    return this.get<TenableIoUsersResponse>(TENABLE_IO_API_PATHS.USERS)
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<ConnectorResponse<TenableIoUser>> {
    return this.get<TenableIoUser>(TENABLE_IO_API_PATHS.USER_BY_ID(userId))
  }

  // ============================================
  // Agent Operations
  // ============================================

  /**
   * Get agents
   */
  async getAgents(filters: GetAgentsFilter = {}): Promise<ConnectorResponse<TenableIoAgentsResponse>> {
    const params: Record<string, unknown> = {}
    if (filters.limit) params.limit = filters.limit
    if (filters.offset) params.offset = filters.offset
    if (filters.sort) params.sort = filters.sort
    if (filters.filter) params.f = filters.filter

    return this.get<TenableIoAgentsResponse>(TENABLE_IO_API_PATHS.AGENTS, params)
  }

  // ============================================
  // Scanner Operations
  // ============================================

  /**
   * Get scanners
   */
  async getScanners(): Promise<ConnectorResponse<TenableIoScannersResponse>> {
    return this.get<TenableIoScannersResponse>(TENABLE_IO_API_PATHS.SCANNERS)
  }

  /**
   * Get scanner by ID
   */
  async getScannerById(scannerId: string): Promise<ConnectorResponse<TenableIoScanner>> {
    return this.get<TenableIoScanner>(TENABLE_IO_API_PATHS.SCANNER_BY_ID(scannerId))
  }

  // ============================================
  // Workbench Operations (Quick Queries)
  // ============================================

  /**
   * Get workbench vulnerabilities (quick query)
   */
  async getWorkbenchVulnerabilities(filters: GetWorkbenchVulnsFilter = {}): Promise<ConnectorResponse<WorkbenchVulnerabilitiesResponse>> {
    const params: Record<string, unknown> = {}
    if (filters.date_range) params.date_range = filters.date_range
    if (filters.filter_search_type) params['filter.search_type'] = filters.filter_search_type
    if (filters.age) params.age = filters.age
    if (filters.exploitable !== undefined) {
      params['filter.0.filter'] = 'exploitable'
      params['filter.0.quality'] = 'eq'
      params['filter.0.value'] = filters.exploitable
    }

    return this.get<WorkbenchVulnerabilitiesResponse>(TENABLE_IO_API_PATHS.WORKBENCH_VULNERABILITIES, params)
  }

  /**
   * Get workbench vulnerability details by plugin ID
   */
  async getWorkbenchVulnInfo(pluginId: number): Promise<ConnectorResponse<WorkbenchVulnInfoResponse>> {
    return this.get<WorkbenchVulnInfoResponse>(TENABLE_IO_API_PATHS.WORKBENCH_VULN_INFO(pluginId))
  }

  /**
   * Get workbench assets (quick query)
   */
  async getWorkbenchAssets(filters: GetWorkbenchAssetsFilter = {}): Promise<ConnectorResponse<WorkbenchAssetsResponse>> {
    const params: Record<string, unknown> = {}
    if (filters.date_range) params.date_range = filters.date_range
    if (filters.filter_search_type) params['filter.search_type'] = filters.filter_search_type
    if (filters.has_agent !== undefined) {
      params['filter.0.filter'] = 'has_agent'
      params['filter.0.quality'] = 'eq'
      params['filter.0.value'] = filters.has_agent
    }

    return this.get<WorkbenchAssetsResponse>(TENABLE_IO_API_PATHS.WORKBENCH_ASSETS, params)
  }

  /**
   * Get workbench asset details
   */
  async getWorkbenchAssetInfo(assetUuid: string): Promise<ConnectorResponse<WorkbenchAssetInfoResponse>> {
    return this.get<WorkbenchAssetInfoResponse>(TENABLE_IO_API_PATHS.WORKBENCH_ASSET_INFO(assetUuid))
  }

  /**
   * Get vulnerabilities for a specific asset
   */
  async getWorkbenchAssetVulnerabilities(assetUuid: string): Promise<ConnectorResponse<WorkbenchAssetVulnsResponse>> {
    return this.get<WorkbenchAssetVulnsResponse>(TENABLE_IO_API_PATHS.WORKBENCH_ASSET_VULNS(assetUuid))
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<ConnectorResponse<TenableIoStats>> {
    try {
      const [assetsResponse, scansResponse, usersResponse] = await Promise.all([
        this.getAssets(),
        this.getScans(),
        this.getUsers(),
      ])

      let agentsCount = 0
      try {
        const agentsResponse = await this.getAgents({ limit: 1 })
        agentsCount = agentsResponse.data?.pagination?.total || agentsResponse.data?.agents?.length || 0
      } catch {
        // Agents might not be available
      }

      const stats: TenableIoStats = {
        summary: {
          totalAssets: assetsResponse.data?.assets?.length || 0,
          totalVulnerabilities: 0, // Would need export for accurate count
          criticalVulns: 0,
          highVulns: 0,
          mediumVulns: 0,
          lowVulns: 0,
          totalScans: scansResponse.data?.scans?.length || 0,
          totalUsers: usersResponse.data?.users?.length || 0,
          totalAgents: agentsCount,
        },
        recentAssets: assetsResponse.data?.assets?.slice(0, 5) || [],
        recentScans: scansResponse.data?.scans?.slice(0, 5) || [],
      }

      return {
        success: true,
        data: stats,
        timestamp: new Date(),
        connector: 'tenable-io',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get statistics',
        timestamp: new Date(),
        connector: 'tenable-io',
      }
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Map severity ID to severity name
   */
  getSeverityName(severityId: number): string {
    return TENABLE_IO_SEVERITY_MAP[severityId] || 'unknown'
  }
}
