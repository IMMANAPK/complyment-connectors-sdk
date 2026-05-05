'use strict'

function parseJsonObject(raw, label = 'AI response') {
  if (raw && typeof raw === 'object') return raw
  const cleaned = String(raw || '').replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error(`${label} was not valid JSON`)
  }
}

module.exports = { parseJsonObject }
