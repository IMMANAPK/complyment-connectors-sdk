import { BaseConnector } from '../../core/BaseConnector'
import { AuthType, ConnectorConfig, ConnectorResponse, LogLevel } from '../../core/types'
import { CrowdStrikeFalconConfig } from './types'
import { API_PATHS, DEFAULT_BASE_URL } from './constants'
import { parseConnectorResponse } from './parser'

export class CrowdStrikeFalconConnector extends BaseConnector {
  constructor(input: CrowdStrikeFalconConfig) {
    const config: ConnectorConfig = {
      name: 'crowdstrike-falcon',
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

  async getDetections(params?: Record<string, unknown>): Promise<ConnectorResponse<unknown>> {
    const response = await this.get<unknown>(API_PATHS.GET_DETECTIONS, params)
    return parseConnectorResponse(response)
  }

  async getDetectionDetails(params?: Record<string, unknown>): Promise<ConnectorResponse<unknown>> {
    const response = await this.get<unknown>(API_PATHS.GET_DETECTION_DETAILS, params)
    return parseConnectorResponse(response)
  }

  async getIncidents(params?: Record<string, unknown>): Promise<ConnectorResponse<unknown>> {
    const response = await this.get<unknown>(API_PATHS.GET_INCIDENTS, params)
    return parseConnectorResponse(response)
  }

  async getDevices(params?: Record<string, unknown>): Promise<ConnectorResponse<unknown>> {
    const response = await this.get<unknown>(API_PATHS.GET_DEVICES, params)
    return parseConnectorResponse(response)
  }

  async getDeviceDetails(params?: Record<string, unknown>): Promise<ConnectorResponse<unknown>> {
    const response = await this.get<unknown>(API_PATHS.GET_DEVICE_DETAILS, params)
    return parseConnectorResponse(response)
  }

  async getAlerts(params?: Record<string, unknown>): Promise<ConnectorResponse<unknown>> {
    const response = await this.get<unknown>(API_PATHS.GET_ALERTS, params)
    return parseConnectorResponse(response)
  }

  async getVulnerabilities(params?: Record<string, unknown>): Promise<ConnectorResponse<unknown>> {
    const response = await this.get<unknown>(API_PATHS.GET_VULNERABILITIES, params)
    return parseConnectorResponse(response)
  }

  async isolateDevice(params?: Record<string, unknown>): Promise<ConnectorResponse<unknown>> {
    const response = await this.delete<unknown>(API_PATHS.ISOLATE_DEVICE, params)
    return parseConnectorResponse(response)
  }
}
