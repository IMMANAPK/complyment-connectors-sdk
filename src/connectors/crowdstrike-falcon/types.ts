export interface CrowdStrikeFalconConfig {
  baseUrl?: string
  apiKey?: string
  token?: string
  username?: string
  password?: string
  timeout?: number
  retries?: number
  dryRun?: boolean
}

export interface CrowdStrikeFalconItem {
  id?: string
  name?: string
  raw?: unknown
}
