'use strict'

function analysisPrompt(docText, humanInstruction = '') {
  return `Analyze this document and extract API information from it. Accept any document that mentions HTTP methods, endpoints, authentication, or operations — including integration guides, Notion pages, and informal API docs.
Only set verdict to "FAIL" or "REJECT" if the document has absolutely no API-related content.
If base URL is not explicitly stated, set it to empty string.
${humanInstruction ? `Additional instruction from human reviewer: "${humanInstruction}"\n` : ''}
Document (first 12000 chars):
${docText.slice(0, 12000)}

Respond with this exact JSON shape:
{
  "isApiDocument": boolean,
  "connectorName": string,
  "authType": "api_key" | "bearer" | "basic" | "oauth2",
  "authDetails": string,
  "authHeaderName": string,
  "baseUrl": string,
  "operationsFound": string[],
  "operationsWithPaths": [{ "name": string, "method": "GET"|"POST"|"PUT"|"PATCH"|"DELETE", "path": string }],
  "confidence": number,
  "missingFields": string[],
  "verdict": "PASS" | "WARN" | "FAIL" | "REJECT",
  "reason": string
}

Rules:
- "authHeaderName": the exact HTTP header name used for the API key (e.g. "x-apikey", "X-Api-Key", "Authorization"). Empty string if not api_key auth.
- "operationsWithPaths": list EVERY operation with its exact HTTP method and URL path from the document. Use path parameters like {id}, {domain}. Never invent paths.
- "operationsFound": the camelCase method name for each operation (e.g. "getFileReport").
- "baseUrl": the exact base URL from the document. Never invent one.`
}

function generationPrompt({ analysis, docText, className, connectorId, mode, humanInstruction, existingFiles = {} }) {
  const opsList = (analysis.operationsFound || []).slice(0, 30).join(', ')
  const opsWithPaths = (analysis.operationsWithPaths || []).slice(0, 30)
  const opsTable = opsWithPaths.length
    ? opsWithPaths.map(o => `  ${o.method} ${o.path}  →  ${o.name}()`).join('\n')
    : '  (see API doc below)'
  const authHeader = analysis.authHeaderName || (analysis.authType === 'api_key' ? 'x-apikey' : '')
  const existing = Object.keys(existingFiles).length
    ? `\nExisting connector files for surgical update:\n${JSON.stringify(existingFiles, null, 2).slice(0, 10000)}\n`
    : ''

  return `Generate a complete ${mode === 'update' ? 'UPDATED' : 'NEW'} TypeScript connector for "${analysis.connectorName}".
${humanInstruction ? `Human instruction: "${humanInstruction}"\n` : ''}

CRITICAL RULES — you MUST follow these exactly:
1. DEFAULT_BASE_URL must be exactly: "${analysis.baseUrl || 'https://api.example.com'}"
2. API_PATHS must use the EXACT paths from the document — never invent paths like /get-file-report
3. Auth header name must be exactly: "${authHeader || 'X-Api-Key'}" (in the headerName field)
4. Implement ALL operations listed below with their correct HTTP method and path
5. For path parameters like {id} or {domain}, add them as method arguments and use template literals: \`\${path}/{id}\`
6. POST/PUT/PATCH methods take a body argument; GET/DELETE do not take a body

Connector context:
- Connector id: ${connectorId}
- Class name: ${className}
- Auth type: ${analysis.authType}
- Auth header: ${authHeader || 'X-Api-Key'}
- Base URL: ${analysis.baseUrl || ''}

Operations to implement (exact paths from the API document):
${opsTable}
${existing}
API Documentation (first 10000 chars):
${docText.slice(0, 10000)}

Return a JSON object with exactly these keys — all values must be valid TypeScript source strings:
{
  "${className}.ts": "<full TypeScript connector class content>",
  "types.ts": "<TypeScript types/interfaces>",
  "constants.ts": "<API paths and defaults — use exact paths above>",
  "parser.ts": "<response normalizer functions>",
  "index.ts": "<barrel exports>",
  "registry_patch": { "sdkClass": "${className}", "label": "${analysis.connectorName}", "desc": string, "color": string, "fields": [], "opsConfig": {} }
}`
}

module.exports = { analysisPrompt, generationPrompt }
