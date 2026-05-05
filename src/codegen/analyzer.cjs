'use strict'
const { getProvider } = require('./providers/factory.cjs')
const { analysisPrompt } = require('./prompt-builder.cjs')
const { parseJsonObject } = require('./output-parser.cjs')

const SYSTEM = `You are an API documentation analyzer for the Complyment Connectors SDK.
Your job is to validate whether a document is a usable API specification.
Always respond with ONLY valid JSON — no markdown, no prose.`

// Returns a structured validation result from the document text.
async function analyzeDocument(docText, humanInstruction = '') {
  try {
    const llm = getProvider()
    const raw = await llm.generate(SYSTEM, analysisPrompt(docText, humanInstruction))
    return normalize(parseJsonObject(raw, 'Analyzer response'), docText)
  } catch {
    return heuristicAnalyze(docText, humanInstruction)
  }
}

function heuristicAnalyze(docText, humanInstruction = '') {
  const text = `${docText}\n${humanInstruction}`
  const bodyText = stripSourceUrlLines(text)
  const connectorName = titleCase(
    pick(/(?:connector|api|service|product)\s*[:=-]\s*([A-Za-z0-9 ._-]{3,60})/i, bodyText)
    || pick(/(?:Demo API|API)\s*:\s*([A-Za-z0-9 ._-]{3,60})/i, bodyText)
    || pick(/\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,3})\s+(?:API|REST|OpenAPI)/, bodyText)
    || 'Generated API'
  )
  const baseUrl = extractBaseUrl(bodyText) || ''
  const authType = /basic/i.test(bodyText) ? 'basic'
    : /bearer|token/i.test(bodyText) ? 'bearer'
      : /oauth/i.test(bodyText) ? 'oauth2'
        : 'api_key'
  const operations = extractOperations(bodyText)
  const missingFields = []
  if (!baseUrl) missingFields.push('baseUrl')
  if (!operations.length) missingFields.push('operations')
  const hasEndpoint = /\b(GET|POST|PUT|PATCH|DELETE)\s+\/[A-Za-z0-9_/:{}?&=-]+/i.test(bodyText)
  const hasSpecMarker = /\b(openapi|swagger|securitySchemes|operationId|components:\s*|paths:\s*)\b/i.test(bodyText)
  const hasAuth = /\b(auth|authentication|api\s*key|bearer|oauth|basic)\b/i.test(bodyText)
  const isApiDocument = hasSpecMarker || hasEndpoint || (hasAuth && operations.length >= 2) || (baseUrl && operations.length >= 2)
  const confidence = Math.min(95, Math.max(55, 60 + operations.length * 7 + (baseUrl ? 10 : 0)))
  const verdict = !isApiDocument || operations.length < 1
    ? 'FAIL'
    : missingFields.length || operations.length < 2
      ? 'WARN'
      : 'PASS'
  return normalize({
    isApiDocument,
    connectorName,
    authType,
    authDetails: authType,
    baseUrl: baseUrl || null,
    operationsFound: operations,
    confidence,
    missingFields,
    verdict,
    reason: verdict === 'PASS'
      ? 'Detected API-oriented text with authentication, base URL, and operations.'
      : operations.length
        ? 'Heuristic analysis completed with missing or partial API details.'
        : 'No API operations or endpoint definitions were found in the extracted document.',
  }, docText)
}

function normalize(result) {
  const operations = Array.isArray(result.operationsFound) ? result.operationsFound : []
  const verdict = ['PASS', 'WARN', 'FAIL', 'REJECT'].includes(result.verdict) ? result.verdict : 'WARN'
  return {
    isApiDocument: !!result.isApiDocument,
    connectorName: result.connectorName || 'Generated API',
    authType: result.authType || 'api_key',
    authDetails: result.authDetails || result.authType || '',
    baseUrl: result.baseUrl || '',
    operationsFound: operations.map(toMethodName).filter(Boolean).slice(0, 30),
    confidence: Number(result.confidence || 70),
    missingFields: Array.isArray(result.missingFields) ? result.missingFields : [],
    verdict,
    reason: result.reason || 'Analysis complete.',
  }
}

function extractOperations(text) {
  const found = new Set()
  const explicit = text.match(/operations?\s*[:=-]\s*([A-Za-z0-9_,\s.-]+)/i)
  if (explicit) {
    explicit[1].split(/[,;\n]/).map(toMethodName).filter(Boolean).forEach(op => found.add(op))
  }
  const endpointRe = /\b(GET|POST|PUT|PATCH|DELETE)\s+\/[A-Za-z0-9_/:{}?&=-]+/gi
  let match
  while ((match = endpointRe.exec(text))) {
    const path = match[0].replace(/^(GET|POST|PUT|PATCH|DELETE)\s+/i, '')
    found.add(toMethodName(`${match[1].toLowerCase()} ${path.split('/').filter(Boolean).at(-1) || 'items'}`))
  }
  const methodRe = /\b(get|list|create|update|delete|launch|isolate|mitigate)[A-Z][A-Za-z0-9]+\b/g
  while ((match = methodRe.exec(text))) found.add(toMethodName(match[0]))
  return [...found].slice(0, 20)
}

function toMethodName(value) {
  const words = String(value || '').replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  const [first, ...rest] = words
  return first.charAt(0).toLowerCase() + first.slice(1) + rest.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
}

function pick(re, text) {
  return text.match(re)?.[1]?.trim()
}

function extractBaseUrl(text) {
  const raw = pick(/base\s*url\s*[:=-]\s*(https?:\/\/[^\s"'<>]+)/i, text)
    || pick(/base\s*url\s*[:=-]?\s*\n+\s*(https?:\/\/[^\s"'<>]+)/i, text)
    || pick(/\bserver\s*[:=-]\s*(https?:\/\/[^\s"'<>]+)/i, text)
  const url = raw ? raw.replace(/[.,;:)}\]]+$/, '') : ''
  return url && !/notion\.site/i.test(url) ? url : ''
}

function stripSourceUrlLines(text) {
  return String(text || '')
    .split('\n')
    .filter(line => !/^Source URL:/i.test(line.trim()))
    .join('\n')
}

function titleCase(value) {
  return String(value).replace(/\s+/g, ' ').trim().replace(/\b\w/g, s => s.toUpperCase())
}

module.exports = { analyzeDocument, heuristicAnalyze }
