// ============================================
// SENTINELONE CONNECTOR - Complyment Connectors SDK
// ============================================

import { BaseConnector } from '../../core/BaseConnector'
import {
  ConnectorConfig,
  ConnectorResponse,
  NormalizedAsset,
  NormalizedThreat,
  AuthType,
  LogLevel,
} from '../../core/types'
import {
  SentinelOneConfig,
  SentinelOneAgent,
  SentinelOneAgentFilter,
  SentinelOneAgentListResponse,
  SentinelOneThreat,
  SentinelOneThreatFilter,
  SentinelOneThreatListResponse,
  SentinelOneActivity,
  SentinelOneGroup,
  SentinelOneSite,
  MitigationRequest,
  MitigationResponse,
} from './types'
import {
  SENTINELONE_API_PATHS,
  SENTINELONE_DEFAULTS,
  SENTINELONE_THREAT_STATUS_MAP,
} from './constants'

export class SentinelOneConnector extends BaseConnector {
  constructor(s1Config: SentinelOneConfig) {
    const config: ConnectorConfig = {
      name: 'sentinelone',
      baseUrl: s1Config.baseUrl,
      auth: {
        type: AuthType.API_KEY,
        apiKey: s1Config.apiToken,
        headerName: 'Authorization',
      },
      timeout: s1Config.timeout ?? 30000,
      retries: s1Config.retries ?? 3,
      cache: s1Config.cache,
      dryRun: s1Config.dryRun,
      logger: LogLevel.INFO,
    }
    super(config)
  }

  // ============================================
  // Auth
  // ============================================

  async authenticate(): Promise<void> {
    // API Token auth - handled by BaseConnector
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.get(SENTINELONE_API_PATHS.SYSTEM_STATUS)
      return true
    } catch {
      return false
    }
  }

  // ============================================
  // Agents (Endpoints)
  // ============================================

  async getAgents(
    filter?: SentinelOneAgentFilter,
  ): Promise<ConnectorResponse<SentinelOneAgentListResponse>> {
    const params: Record<string, unknown> = {
      limit: filter?.limit ?? SENTINELONE_DEFAULTS.LIMIT,
    }

    if (filter?.status?.length) params['isActive'] = filter.status.includes('connected')
    if (filter?.infected !== undefined) params['infected'] = filter.infected
    if (filter?.osName) params['osTypes'] = filter.osName
    if (filter?.computerName) params['computerName'] = filter.computerName
    if (filter?.cursor) params['cursor'] = filter.cursor

    return this.get<SentinelOneAgentListResponse>(
      SENTINELONE_API_PATHS.AGENTS,
      params,
      true, // cache
    )
  }

  async getAgentById(
    agentId: string,
  ): Promise<ConnectorResponse<SentinelOneAgent>> {
    return this.get<SentinelOneAgent>(SENTINELONE_API_PATHS.AGENT_BY_ID(agentId))
  }

  async getInfectedAgents(): Promise<ConnectorResponse<SentinelOneAgentListResponse>> {
    return this.getAgents({ infected: true })
  }

  async disconnectAgentFromNetwork(
    agentId: string,
  ): Promise<ConnectorResponse<void>> {
    return this.post(SENTINELONE_API_PATHS.AGENT_DISCONNECT(agentId))
  }

  async reconnectAgentToNetwork(
    agentId: string,
  ): Promise<ConnectorResponse<void>> {
    return this.post(SENTINELONE_API_PATHS.AGENT_CONNECT(agentId))
  }

  async initiateAgentScan(
    agentId: string,
  ): Promise<ConnectorResponse<void>> {
    return this.post(SENTINELONE_API_PATHS.AGENT_SCAN(agentId))
  }

  // ============================================
  // Threats
  // ============================================

  async getThreats(
    filter?: SentinelOneThreatFilter,
  ): Promise<ConnectorResponse<SentinelOneThreatListResponse>> {
    const params: Record<string, unknown> = {
      limit: filter?.limit ?? SENTINELONE_DEFAULTS.LIMIT,
    }

    if (filter?.status?.length) params['mitigationStatuses'] = filter.status.join(',')
    if (filter?.severity?.length) params['severities'] = filter.severity.join(',')
    if (filter?.confidenceLevel?.length) params['confidenceLevels'] = filter.confidenceLevel.join(',')
    if (filter?.agentId) params['agentIds'] = filter.agentId
    if (filter?.cursor) params['cursor'] = filter.cursor
    if (filter?.createdAfter) params['createdAt__gte'] = filter.createdAfter
    if (filter?.createdBefore) params['createdAt__lte'] = filter.createdBefore

    return this.get<SentinelOneThreatListResponse>(
      SENTINELONE_API_PATHS.THREATS,
      params,
    )
  }

  async getActiveThreatCount(): Promise<number> {
    const response = await this.getThreats({ status: ['active'] })
    return response.data?.pagination.totalItems ?? 0
  }

  async getCriticalThreats(): Promise<ConnectorResponse<SentinelOneThreatListResponse>> {
    return this.getThreats({
      severity: ['critical', 'high'],
      status: ['active', 'suspicious'],
    })
  }

  // ============================================
  // Mitigation
  // ============================================

  async mitigateThreats(
    request: MitigationRequest,
  ): Promise<ConnectorResponse<MitigationResponse>> {
    return this.post<MitigationResponse>(
      SENTINELONE_API_PATHS.THREAT_MITIGATE(request.action),
      { filter: { ids: request.threatIds } },
    )
  }

  async quarantineThreat(
    threatId: string,
  ): Promise<ConnectorResponse<MitigationResponse>> {
    return this.mitigateThreats({
      threatIds: [threatId],
      action: 'quarantine',
    })
  }

  async killThreat(
    threatId: string,
  ): Promise<ConnectorResponse<MitigationResponse>> {
    return this.mitigateThreats({
      threatIds: [threatId],
      action: 'kill',
    })
  }

  async remediateThreat(
    threatId: string,
  ): Promise<ConnectorResponse<MitigationResponse>> {
    return this.mitigateThreats({
      threatIds: [threatId],
      action: 'remediate',
    })
  }

  // ============================================
  // Activities
  // ============================================

  async getActivities(
    limit = SENTINELONE_DEFAULTS.LIMIT,
  ): Promise<ConnectorResponse<SentinelOneActivity[]>> {
    return this.get<SentinelOneActivity[]>(SENTINELONE_API_PATHS.ACTIVITIES, {
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
  }

  // ============================================
  // Groups & Sites
  // ============================================

  async getGroups(): Promise<ConnectorResponse<SentinelOneGroup[]>> {
    return this.get<SentinelOneGroup[]>(SENTINELONE_API_PATHS.GROUPS, {
      limit: SENTINELONE_DEFAULTS.MAX_LIMIT,
    }, true)
  }

  async getSites(): Promise<ConnectorResponse<SentinelOneSite[]>> {
    return this.get<SentinelOneSite[]>(SENTINELONE_API_PATHS.SITES, {
      limit: SENTINELONE_DEFAULTS.MAX_LIMIT,
    }, true)
  }

  // ============================================
  // Normalization
  // ============================================

  async getNormalizedThreats(
    filter?: SentinelOneThreatFilter,
  ): Promise<ConnectorResponse<NormalizedThreat[]>> {
    const response = await this.getThreats(filter)

    if (!response.data) return { ...response, data: [] }

    const normalized: NormalizedThreat[] = response.data.data.map((threat) => ({
      id: threat.id,
      name: threat.threatName,
      severity: threat.severity,
      status: this.mapThreatStatus(threat.mitigationStatus),
      affectedAsset: threat.agentComputerName,
      source: 'sentinelone',
      detectedAt: new Date(threat.createdAt),
      raw: threat,
    }))

    return { ...response, data: normalized }
  }

  async getNormalizedAssets(
    filter?: SentinelOneAgentFilter,
  ): Promise<ConnectorResponse<NormalizedAsset[]>> {
    const response = await this.getAgents(filter)

    if (!response.data) return { ...response, data: [] }

    const normalized: NormalizedAsset[] = response.data.data.map((agent) => ({
      id: agent.id,
      hostname: agent.computerName,
      ipAddress: agent.ipAddress,
      os: `${agent.osName} ${agent.osVersion}`,
      type: 'workstation',
      source: 'sentinelone',
      lastSeen: new Date(agent.lastActiveDate),
      raw: agent,
    }))

    return { ...response, data: normalized }
  }

  // ============================================
  // Private Helpers
  // ============================================

  private mapThreatStatus(
    status: string,
  ): 'active' | 'resolved' | 'investigating' {
    return SENTINELONE_THREAT_STATUS_MAP[status] ?? 'active'
  }
}
