'use strict'
const fs   = require('fs')
const path = require('path')
const { getProvider } = require('./providers/factory.cjs')
const { generationPrompt } = require('./prompt-builder.cjs')
const { parseJsonObject } = require('./output-parser.cjs')
const { writeGeneratedFiles } = require('./file-writer.cjs')

const SYSTEM = `You are a TypeScript SDK engineer for the Complyment Connectors SDK.
You generate production-quality connector code that extends BaseConnector from ../../core/BaseConnector.
Always respond with ONLY valid JSON — no markdown outside JSON values, no prose.`

// Generates all connector files from document analysis result.
// mode: 'create' | 'update'
async function generateConnector(analysis, docText, mode = 'create', humanInstruction = '') {
  const className = toClassName(analysis.connectorName)
  const connectorId = toId(analysis.connectorName)
  const operations = normalizeOps(analysis.operationsFound)
  try {
    const llm = getProvider()
    const prompt = generationPrompt({ analysis, docText, className, connectorId, mode, humanInstruction })
    const raw = await llm.generate(SYSTEM, prompt)
    const parsed = parseJsonObject(raw, 'Generator response')
    return { className, connectorId, files: parsed, mode, operations, analysis }
  } catch {
    return { className, connectorId, files: heuristicFiles({ analysis, className, connectorId, operations }), mode, operations, analysis }
  }
}

// Writes generated files to disk under src/connectors/{connectorId}/
function writeFiles(result, rootDir = process.cwd(), options = {}) {
  return writeGeneratedFiles(result, rootDir, options)
}

function heuristicFiles({ analysis, className, connectorId, operations }) {
  const authType = normalizeAuth(analysis.authType)
  const apiPaths = operations.map(op => `  ${constantName(op)}: '/${dasherize(op)}',`).join('\n')
  const methods = operations.map(op => {
    const httpMethod = inferHttpMethod(op)
    const hasBody = ['post', 'put', 'patch'].includes(httpMethod)
    const paramSig = hasBody
      ? `body?: Record<string, unknown>, params?: Record<string, unknown>`
      : `params?: Record<string, unknown>`
    const callArgs = hasBody
      ? `API_PATHS.${constantName(op)}, body, params`
      : `API_PATHS.${constantName(op)}, params`
    return `  async ${op}(${paramSig}): Promise<ConnectorResponse<unknown>> {
    const response = await this.${httpMethod}<unknown>(${callArgs})
    return parseConnectorResponse(response)
  }`
  }).join('\n\n')

  return {
    [`${className}.ts`]: `import { BaseConnector } from '../../core/BaseConnector'
import { AuthType, ConnectorConfig, ConnectorResponse, LogLevel } from '../../core/types'
import { ${className.replace(/Connector$/, 'Config')} } from './types'
import { API_PATHS, DEFAULT_BASE_URL } from './constants'
import { parseConnectorResponse } from './parser'

export class ${className} extends BaseConnector {
  constructor(input: ${className.replace(/Connector$/, 'Config')}) {
    const config: ConnectorConfig = {
      name: '${connectorId}',
      baseUrl: input.baseUrl || DEFAULT_BASE_URL,
      auth: ${authConfigExpression(authType)},
      timeout: input.timeout ?? 30000,
      retries: input.retries ?? 3,
      dryRun: input.dryRun,
      logger: LogLevel.INFO,
    }
    super(config)
  }

  async authenticate(): Promise<void> {
    // ${authType} auth is injected by BaseConnector.
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.get(API_PATHS.HEALTH)
      return true
    } catch {
      return false
    }
  }

${methods}
}
`,
    'types.ts': `export interface ${className.replace(/Connector$/, 'Config')} {
  baseUrl?: string
  apiKey?: string
  token?: string
  username?: string
  password?: string
  timeout?: number
  retries?: number
  dryRun?: boolean
}

export interface ${className.replace(/Connector$/, 'Item')} {
  id?: string
  name?: string
  raw?: unknown
}
`,
    'constants.ts': `export const DEFAULT_BASE_URL = '${(analysis.baseUrl || 'https://api.example.com').replace(/[.,;]+$/, '')}'

export const API_PATHS = {
  HEALTH: '/health',
${apiPaths}
} as const
`,
    'parser.ts': `import { ConnectorResponse } from '../../core/types'

export function parseConnectorResponse<T>(response: ConnectorResponse<T>): ConnectorResponse<T> {
  return response
}
`,
    'index.ts': `export { ${className} } from './${className}'
export * from './types'
`,
    registry_patch: {
      sdkClass: className,
      label: analysis.connectorName,
      desc: 'Generated connector',
      color: '#00cfb0',
    },
  }
}

function normalizeOps(ops) {
  const list = Array.isArray(ops) ? ops : []
  return [...new Set(list.map(toMethodName).filter(Boolean))].slice(0, 30)
}

function normalizeAuth(authType = '') {
  const auth = String(authType).toLowerCase()
  if (auth.includes('basic')) return 'basic'
  if (auth.includes('bearer')) return 'bearer'
  if (auth.includes('oauth')) return 'oauth2'
  return 'api_key'
}

function authConfigExpression(authType) {
  if (authType === 'basic') return `{ type: AuthType.BASIC, username: input.username || '', password: input.password || '' }`
  if (authType === 'bearer') return `{ type: AuthType.BEARER, token: input.token || input.apiKey || '' }`
  if (authType === 'oauth2') return `{ type: AuthType.BEARER, token: input.token || input.apiKey || '' }`
  return `{ type: AuthType.API_KEY, apiKey: input.apiKey || input.token || '', headerName: 'X-API-Key' }`
}

function inferHttpMethod(op) {
  const name = String(op).toLowerCase()
  if (/^(create|add|post|submit|send|upload|register|invite|trigger|launch|start)/.test(name)) return 'post'
  if (/^(update|edit|set|put|replace|modify)/.test(name)) return 'put'
  if (/^(patch|merge|partial)/.test(name)) return 'patch'
  if (/^(delete|remove|destroy|purge|revoke|deactivate|disable|cancel|stop|kill|isolate|block)/.test(name)) return 'delete'
  return 'get'
}

function constantName(op) {
  return String(op).replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()
}

function dasherize(op) {
  return String(op).replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()
}

function toMethodName(value) {
  const words = String(value || '').replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  const [first, ...rest] = words
  return first.charAt(0).toLowerCase() + first.slice(1) + rest.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
}

function toClassName(name) {
  return name.replace(/[^A-Za-z0-9\s]/g, '').split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + 'Connector'
}

function toId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

module.exports = { generateConnector, writeFiles }
