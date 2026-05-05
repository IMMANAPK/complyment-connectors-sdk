import { BaseConnector } from '../../core/BaseConnector'
import { AuthType, ConnectorConfig, ConnectorResponse, LogLevel } from '../../core/types'
import { SentinelOneSingularityConfig } from './types'
import { API_PATHS, DEFAULT_BASE_URL } from './constants'
import { parseConnectorResponse } from './parser'

export class SentinelOneSingularityConnector extends BaseConnector {
  constructor(input: SentinelOneSingularityConfig) {
    const config: ConnectorConfig = {
      name: 'sentinelone-singularity',
      baseUrl: input.baseUrl || DEFAULT_BASE_URL,
      auth: { type: AuthType.BEARER, token: input.token || input.apiKey || '' },
      timeout: input.timeout ?? 30000,
      retries: input.retries ?? 3,
      dryRun: input.dryRun,
      logger: LogLevel.INFO,
    }
    super(config)
  }

  async authenticate(): Promise<void> {
    // bearer auth is injected by BaseConnector.
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.get(API_PATHS.HEALTH)
      return true
    } catch {
      return false
    }
  }

  async getThreats(params?: Record<string, unknown>): Promise<ConnectorResponse<unknown>> {
    const response = await this.get<unknown>(API_PATHS.GET_THREATS, params)
    return parseConnectorResponse(response)
  }

  async mitigateThreat(params?: Record<string, unknown>): Promise<ConnectorResponse<unknown>> {
    const response = await this.get<unknown>(API_PATHS.MITIGATE_THREAT, params)
    return parseConnectorResponse(response)
  }

  async getAgents(params?: Record<string, unknown>): Promise<ConnectorResponse<unknown>> {
    const response = await this.get<unknown>(API_PATHS.GET_AGENTS, params)
    return parseConnectorResponse(response)
  }

  async isolateAgent(params?: Record<string, unknown>): Promise<ConnectorResponse<unknown>> {
    const response = await this.delete<unknown>(API_PATHS.ISOLATE_AGENT, params)
    return parseConnectorResponse(response)
  }

  async getSites(params?: Record<string, unknown>): Promise<ConnectorResponse<unknown>> {
    const response = await this.get<unknown>(API_PATHS.GET_SITES, params)
    return parseConnectorResponse(response)
  }

  async getActivities(params?: Record<string, unknown>): Promise<ConnectorResponse<unknown>> {
    const response = await this.get<unknown>(API_PATHS.GET_ACTIVITIES, params)
    return parseConnectorResponse(response)
  }

  async getGroups(params?: Record<string, unknown>): Promise<ConnectorResponse<unknown>> {
    const response = await this.get<unknown>(API_PATHS.GET_GROUPS, params)
    return parseConnectorResponse(response)
  }

  async getAlerts(params?: Record<string, unknown>): Promise<ConnectorResponse<unknown>> {
    const response = await this.get<unknown>(API_PATHS.GET_ALERTS, params)
    return parseConnectorResponse(response)
  }
}
