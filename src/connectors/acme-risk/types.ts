export interface AcmeRiskConfig {
  baseUrl?: string
  apiKey?: string
  token?: string
  username?: string
  password?: string
  timeout?: number
  retries?: number
  dryRun?: boolean
}

export interface AcmeRiskItem {
  id?: string
  name?: string
  raw?: unknown
}
