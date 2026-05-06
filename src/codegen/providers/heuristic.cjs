'use strict'

async function generate(systemPrompt, userPrompt) {
  if (!/Respond ONLY with valid JSON/i.test(systemPrompt) || !/"action"/.test(systemPrompt)) {
    throw new Error('Heuristic provider does not support free-form generation directly')
  }

  const role = systemPrompt.split('\n')[0] || ''
  const task = _section(userPrompt, 'TASK')
  const memory = _parseMemory(userPrompt)

  if (/text extractor/i.test(role)) {
    const payload = _jsonFromText(task) || {}
    const docText = payload.docText || payload.docUrl || payload.docPath || task
    return _complete({ docText }, 'Extracted document text')
  }

  if (/documentation analyzer/i.test(role)) {
    const docText = memory['result:text-extractor']?.result?.docText || task
    return _complete(_analyze(docText), 'Analyzed API document', 92)
  }

  if (/quality checker/i.test(role)) {
    const analysis = memory['result:api-analyzer']?.result || _analyze(task)
    return _complete({ verdict: analysis.verdict || 'PASS', reason: analysis.reason || 'Looks usable', analysis }, 'Checked analysis quality', 90)
  }

  if (/branch manager/i.test(role)) {
    const connectorId = _pick(/connector "([^"]+)"/i, task) || 'generated-api'
    return _complete({ branch: `connector/${connectorId}`, action: 'dry-run', hadConflicts: false }, 'Prepared branch result')
  }

  if (/conflict detector/i.test(role)) {
    return _complete({ exists: false, fileCount: 0, files: [] }, 'Checked connector files')
  }

  if (/changelog generator/i.test(role)) {
    return _complete({ changes: [], hasBreaking: false }, 'Generated changelog')
  }

  if (/mode selector/i.test(role)) {
    return _complete({ mode: 'create', reason: 'No existing connector detected' }, 'Selected create mode')
  }

  if (/code generator/i.test(role)) {
    const name = _pick(/Connector:\s*([^\n]+)/i, task) || 'Generated API'
    const className = _className(name)
    return _complete({ className, files: _files(className, name) }, 'Generated connector files', 85)
  }

  if (/file writer/i.test(role)) {
    const generator = memory['result:generator']?.result || {}
    return _complete({
      writtenFiles: Object.keys(generator.files || {}),
      className: generator.className || 'GeneratedApiConnector',
    }, 'Recorded generated files')
  }

  if (/type checker/i.test(role) || /verifier/i.test(role)) {
    return _complete({ passed: true, errors: [] }, 'Typecheck passed')
  }

  if (/error fixer|failure fixer/i.test(role)) {
    return _complete({ fixed: false, reason: 'No errors' }, 'No fix required')
  }

  if (/test runner|test verifier/i.test(role)) {
    return _complete({ passed: true, skipped: true, summary: 'Tests skipped in heuristic smoke test' }, 'Tests skipped')
  }

  if (/static analyzer/i.test(role)) {
    return _complete({ score: 90, issues: [] }, 'Static review passed')
  }

  if (/security reviewer/i.test(role)) {
    return _complete({ issues: [], risk: 'low' }, 'Security review passed')
  }

  if (/scorer/i.test(role)) {
    return _complete({ score: 90, verdict: 'APPROVED', issues: [] }, 'Scored review')
  }

  if (/commit|push|pull request|pr creator/i.test(role)) {
    return _complete({ dryRun: true, url: null, title: 'Dry-run PR' }, 'Prepared git/PR dry-run result')
  }

  if (/notifier|summary/i.test(role)) {
    return _complete({ sent: false, dryRun: true, summary: 'Notification dry run' }, 'Prepared notification')
  }

  return _complete({}, 'Heuristic task completed')
}

function _complete(result, summary, confidence = 80) {
  return JSON.stringify({ action: 'complete', result, summary, confidence })
}

function _section(text, name) {
  const match = String(text || '').match(new RegExp(`${name}:\\n([\\s\\S]*?)(?:\\n[A-Z ]+:|$)`))
  return match?.[1]?.trim() || ''
}

function _parseMemory(prompt) {
  const raw = _section(prompt, 'AVAILABLE MEMORY')
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

function _jsonFromText(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

function _analyze(text) {
  const connectorName = _pick(/(?:Demo API|API|Service|Connector)\s*:\s*([A-Za-z0-9 ._-]+)/i, text) || 'Generated API'
  const baseUrl = _pick(/Base URL:\s*(https?:\/\/[^\s.]+(?:\.[^\s.]+)*(?:\.[^\s,]+)?)/i, text) || 'https://api.example.com'
  const ops = (_pick(/Operations:\s*([A-Za-z0-9_,\s-]+)/i, text) || 'listItems,getItem')
    .split(/[,;\n]/)
    .map(_methodName)
    .filter(Boolean)
  return {
    isApiDocument: true,
    connectorName: connectorName.trim().replace(/[.]+$/, ''),
    authType: /bearer/i.test(text) ? 'bearer' : /basic/i.test(text) ? 'basic' : 'api_key',
    authDetails: 'api_key',
    baseUrl,
    operationsFound: [...new Set(ops)],
    confidence: 92,
    missingFields: [],
    verdict: 'PASS',
    reason: 'Detected API name, auth, base URL, and operations.',
  }
}

function _files(className, name) {
  const configName = className.replace(/Connector$/, 'Config')
  return {
    [`${className}.ts`]: `import { BaseConnector } from '../../core/BaseConnector'\nimport { AuthType, ConnectorConfig } from '../../core/types'\nimport { ${configName} } from './types'\nimport { DEFAULT_BASE_URL } from './constants'\n\nexport class ${className} extends BaseConnector {\n  constructor(input: ${configName}) {\n    const config: ConnectorConfig = {\n      name: '${_toId(name)}',\n      baseUrl: input.baseUrl || DEFAULT_BASE_URL,\n      auth: { type: AuthType.API_KEY, apiKey: input.apiKey || '', headerName: 'X-API-Key' },\n      dryRun: input.dryRun,\n    }\n    super(config)\n  }\n\n  async authenticate(): Promise<void> {}\n\n  async testConnection(): Promise<boolean> {\n    return true\n  }\n}\n`,
    'types.ts': `export interface ${configName} {\n  baseUrl?: string\n  apiKey?: string\n  dryRun?: boolean\n}\n`,
    'constants.ts': "export const DEFAULT_BASE_URL = 'https://api.example.com'\n",
    'parser.ts': "export function parseConnectorResponse<T>(value: T): T {\n  return value\n}\n",
    'index.ts': `export { ${className} } from './${className}'\nexport * from './types'\n`,
    registry_patch: { sdkClass: className, label: name, desc: 'Generated connector', color: '#00cfb0' },
  }
}

function _pick(re, text) { return String(text || '').match(re)?.[1]?.trim() }
function _className(name) {
  return String(name || 'Generated API').replace(/[^A-Za-z0-9\s]/g, '').split(/\s+/)
    .filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + 'Connector'
}
function _toId(name) { return String(name || 'generated-api').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
function _methodName(value) {
  const words = String(value || '').replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  const [first, ...rest] = words
  return first.charAt(0).toLowerCase() + first.slice(1) + rest.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
}

module.exports = { generate }
