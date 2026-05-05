export interface SentinelOneSingularityConfig {
  baseUrl?: string
  apiKey?: string
  token?: string
  username?: string
  password?: string
  timeout?: number
  retries?: number
  dryRun?: boolean
}

export interface SentinelOneSingularityItem {
  id?: string
  name?: string
  raw?: unknown
}
