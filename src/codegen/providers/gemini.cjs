'use strict'
const https = require('https')

// Calls Google Gemini API (gemini-1.5-pro)
async function generate(systemPrompt, userPrompt) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY not set')

  const model = 'gemini-1.5-pro'
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { maxOutputTokens: 8192 },
  })

  return new Promise((resolve, reject) => {
    const path = `/v1beta/models/${model}:generateContent?key=${key}`
    const req = https.request(
      { hostname: 'generativelanguage.googleapis.com', path, method: 'POST',
        headers: { 'Content-Type': 'application/json' } },
      res => {
        let data = ''
        res.on('data', chunk => (data += chunk))
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (json.error) return reject(new Error(`Gemini: ${json.error.message}`))
            resolve(json.candidates?.[0]?.content?.parts?.[0]?.text ?? '')
          } catch (e) {
            reject(new Error(`Gemini parse error: ${e.message}`))
          }
        })
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

module.exports = { generate }
