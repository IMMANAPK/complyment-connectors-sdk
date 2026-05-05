'use strict'

function analysisPrompt(docText, humanInstruction = '') {
  return `Analyze this document and determine if it is valid API documentation.
${humanInstruction ? `Additional instruction from human reviewer: "${humanInstruction}"\n` : ''}
Document (first 12000 chars):
${docText.slice(0, 12000)}

Respond with this exact JSON shape:
{
  "isApiDocument": boolean,
  "connectorName": string,
  "authType": string,
  "authDetails": string,
  "baseUrl": string,
  "operationsFound": string[],
  "confidence": number,
  "missingFields": string[],
  "verdict": "PASS" | "WARN" | "FAIL" | "REJECT",
  "reason": string
}`
}

function generationPrompt({ analysis, docText, className, connectorId, mode, humanInstruction, existingFiles = {} }) {
  const opsList = (analysis.operationsFound || []).slice(0, 30).join(', ')
  const existing = Object.keys(existingFiles).length
    ? `\nExisting connector files for surgical update:\n${JSON.stringify(existingFiles, null, 2).slice(0, 10000)}\n`
    : ''

  return `Generate a complete ${mode === 'update' ? 'UPDATED' : 'NEW'} connector for "${analysis.connectorName}".
${humanInstruction ? `Human instruction: "${humanInstruction}"\n` : ''}
Context:
- Connector id: ${connectorId}
- Class name: ${className}
- Auth: ${analysis.authType}
- Auth details: ${analysis.authDetails || ''}
- Base URL: ${analysis.baseUrl}
- Operations: ${opsList}
${existing}
API Documentation (first 10000 chars):
${docText.slice(0, 10000)}

Return a JSON object with exactly these keys:
{
  "${className}.ts": "<full TypeScript connector class content>",
  "types.ts": "<TypeScript types/interfaces>",
  "constants.ts": "<API paths and defaults>",
  "parser.ts": "<response normalizer functions>",
  "index.ts": "<barrel exports>",
  "registry_patch": { "sdkClass": "${className}", "label": "${analysis.connectorName}", "desc": string, "color": string, "fields": [], "opsConfig": {} }
}`
}

module.exports = { analysisPrompt, generationPrompt }
