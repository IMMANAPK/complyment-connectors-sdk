'use strict'
const https = require('https')

// Calls OpenAI Chat Completions API (gpt-4o)
async function generate(systemPrompt, userPrompt) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY not set')

  const body = JSON.stringify({
    model: 'gpt-4o',
    max_tokens: 8192,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
      },
      res => {
        let data = ''
        res.on('data', chunk => (data += chunk))
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (json.error) return reject(new Error(`OpenAI: ${json.error.message}`))
            resolve(json.choices?.[0]?.message?.content ?? '')
          } catch (e) {
            reject(new Error(`OpenAI parse error: ${e.message}`))
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
