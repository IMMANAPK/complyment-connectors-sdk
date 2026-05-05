import { ConnectorResponse } from '../../core/types'

export function parseConnectorResponse<T>(response: ConnectorResponse<T>): ConnectorResponse<T> {
  return response
}
