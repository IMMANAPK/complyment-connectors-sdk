'use strict'
const fs = require('fs')
const path = require('path')

// Extracts raw text from a document file or URL.
// Supports: PDF, OpenAPI JSON/YAML, Markdown, HTML, plain text, and public web pages.

async function extractSource(source) {
  if (isUrl(source)) return extractUrl(source)
  return extractText(source)
}

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const raw = fs.readFileSync(filePath)

  if (ext === '.pdf') return extractPdf(raw)
  if (ext === '.json') return extractJson(raw.toString('utf8'))
  if (ext === '.yaml' || ext === '.yml') return extractYaml(raw.toString('utf8'))
  if (ext === '.html' || ext === '.htm') return extractHtml(raw.toString('utf8'))
  return raw.toString('utf8')
}

async function extractUrl(url) {
  if (!isUrl(url)) throw new Error(`Invalid URL: ${url}`)
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/json,application/yaml,text/yaml,text/plain,*/*',
        'User-Agent': 'ComplymentConnectorGenerator/0.3.5',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const contentType = (res.headers.get('content-type') || '').toLowerCase()
    const body = await res.text()
    if (contentType.includes('application/json') || looksLikeJson(body)) return extractJson(body)
    if (contentType.includes('yaml') || /\.ya?ml(?:[?#]|$)/i.test(url)) return extractYaml(body)
    if (contentType.includes('html') || /<html|<!doctype/i.test(body)) {
      const text = extractHtml(body, url)
      if (hasEnoughDocumentText(text)) return text
      return extractRenderedUrl(url, text)
    }
    if (hasEnoughDocumentText(body)) return body
    return extractRenderedUrl(url, body)
  } catch (err) {
    return extractRenderedUrl(url, `Fetch failed: ${err.message}`)
  }
}

async function extractPdf(buffer) {
  const pdfParse = require('pdf-parse')
  const data = await pdfParse(buffer)
  const text = String(data.text || '').trim()
  if (!text) throw new Error('PDF text extraction returned no readable text')
  return text
}

function extractJson(text) {
  const parsed = JSON.parse(text)
  return flattenOpenApi(parsed) || JSON.stringify(parsed, null, 2)
}

function extractYaml(text) {
  const yaml = require('js-yaml')
  const parsed = yaml.load(text)
  return flattenOpenApi(parsed) || JSON.stringify(parsed, null, 2)
}

function extractHtml(html, sourceUrl = '') {
  const { parse } = require('node-html-parser')
  const root = parse(html)
  const metadata = []
  for (const selector of ['title', 'meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]']) {
    const node = root.querySelector(selector)
    const value = selector.startsWith('meta') ? node?.getAttribute('content') : node?.text
    if (value) metadata.push(value.trim())
  }
  const scriptText = extractEmbeddedJsonText(root)
  root.querySelectorAll('script,style,noscript,svg').forEach(node => node.remove())
  const readable = root.structuredText.replace(/\n{3,}/g, '\n\n').trim()
  return [
    sourceUrl ? `Source URL: ${sourceUrl}` : '',
    ...metadata,
    readable,
    scriptText,
  ].filter(Boolean).join('\n\n').replace(/\n{4,}/g, '\n\n\n').trim()
}

function flattenOpenApi(doc) {
  if (!doc || typeof doc !== 'object' || !doc.paths) return null
  const lines = []
  lines.push(`OpenAPI: ${doc.info?.title || 'Untitled API'}`)
  if (doc.info?.version) lines.push(`Version: ${doc.info.version}`)
  const server = Array.isArray(doc.servers) ? doc.servers[0]?.url : null
  if (server) lines.push(`Base URL: ${server}`)
  const securitySchemes = doc.components?.securitySchemes || {}
  if (Object.keys(securitySchemes).length) {
    lines.push(`Auth: ${Object.entries(securitySchemes).map(([name, scheme]) => `${name} ${scheme.type || ''} ${scheme.scheme || ''} ${scheme.in || ''}`).join(', ')}`)
  }
  lines.push('Operations:')
  for (const [route, methods] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(methods || {})) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) continue
      lines.push(`${method.toUpperCase()} ${route} ${op.operationId || ''} ${op.summary || ''}`)
    }
  }
  return lines.join('\n')
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function extractEmbeddedJsonText(root) {
  const chunks = []
  for (const node of root.querySelectorAll('script[type="application/json"], script#__NEXT_DATA__')) {
    const text = node.text.trim()
    if (!text) continue
    try {
      chunks.push(collectStrings(JSON.parse(text)).join('\n'))
    } catch {
      chunks.push(text)
    }
  }
  return chunks.join('\n').slice(0, 50000)
}

async function extractRenderedUrl(url, fetchText = '') {
  let chromium
  try {
    ;({ chromium } = require('@playwright/test'))
  } catch {
    if (fetchText) return fetchText
    throw new Error('URL requires browser rendering, but @playwright/test is not installed')
  }

  let browser
  try {
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await page.waitForTimeout(1500)
    await dismissCommonOverlays(page)
    await page.waitForTimeout(500)

    const rendered = await page.evaluate(() => {
      const title = document.title || ''
      const meta = [...document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]')]
        .map(node => node.getAttribute('content'))
        .filter(Boolean)
        .join('\n')
      const text = document.body?.innerText || ''
      return [title, meta, text].filter(Boolean).join('\n\n')
    })
    const combined = [`Source URL: ${url}`, fetchText, rendered].filter(Boolean).join('\n\n')
    return combined.replace(/\n{4,}/g, '\n\n\n').trim()
  } catch (err) {
    if (fetchText) return `${fetchText}\n\n[Rendered extraction failed: ${err.message}]`
    throw err
  } finally {
    await browser?.close()
  }
}

async function dismissCommonOverlays(page) {
  const labels = [
    'Explore',
    'Continue',
    'Get started',
    'Start',
    'Close',
    'Maybe later',
    'Skip',
    'Accept',
    'I understand',
  ]
  for (const label of labels) {
    const locator = page.getByRole('button', { name: new RegExp(`^${escapeRegExp(label)}$`, 'i') }).first()
    try {
      if (await locator.isVisible({ timeout: 600 })) {
        await locator.click({ timeout: 1500 })
        return
      }
    } catch { /* try next label */ }
  }
  try { await page.keyboard.press('Escape') } catch { /* ok */ }
}

function hasEnoughDocumentText(text) {
  const clean = String(text || '').trim()
  return clean.length > 500 && /api|auth|endpoint|operation|connector|base url|token|bearer|openapi/i.test(clean)
}

function collectStrings(value, out = []) {
  if (typeof value === 'string') {
    const cleaned = value.replace(/\s+/g, ' ').trim()
    if (cleaned.length > 2 && /api|auth|endpoint|http|connector|operation|get|post|put|delete/i.test(cleaned)) out.push(cleaned)
  } else if (Array.isArray(value)) {
    value.forEach(item => collectStrings(item, out))
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach(item => collectStrings(item, out))
  }
  return out
}

function isUrl(value) {
  return /^https?:\/\//i.test(String(value || ''))
}

function looksLikeJson(text) {
  return /^[\s\n]*[{[]/.test(text)
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

module.exports = { extractSource, extractText, extractUrl, extractPdf, extractJson, extractYaml, extractHtml }
