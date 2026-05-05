import { BaseConnector } from '../../core/BaseConnector'
import { AuthType, ConnectorConfig, ConnectorResponse, LogLevel } from '../../core/types'
import { AcmeRiskConfig } from './types'
import { API_PATHS, DEFAULT_BASE_URL } from './constants'
import { parseConnectorResponse } from './parser'

export class AcmeRiskConnector extends BaseConnector {
  constructor(input: AcmeRiskConfig) {
    const config: ConnectorConfig = {
      name: 'acme-risk',
      baseUrl: input.baseUrl || DEFAULT_BASE_URL,
      auth: { type: AuthType.API_KEY, apiKey: input.apiKey || input.token || '', headerName: 'X-API-Key' },
      timeout: input.timeout ?? 30000,
      retries: input.retries ?? 3,
      dryRun: input.dryRun,
      logger: LogLevel.INFO,
    }
    super(config)
  }

  async authenticate(): Promise<void> {
    // api_key auth is injected by BaseConnector.
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.get(API_PATHS.HEALTH)
      return true
    } catch {
      return false
    }
  }

  async getAssets(params?: Record<string, unknown>): Promise<ConnectorResponse<unknown>> {
    const response = await this.get<unknown>(API_PATHS.GET_ASSETS, params)
    return parseConnectorResponse(response)
  }
}
