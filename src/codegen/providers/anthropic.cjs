'use strict'
const https = require('https')

// Calls Anthropic Messages API (claude-3-5-sonnet-20241022)
async function generate(systemPrompt, userPrompt) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY not set')

  const body = JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
      },
      res => {
        let data = ''
        res.on('data', chunk => (data += chunk))
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (json.error) return reject(new Error(`Anthropic: ${json.error.message}`))
            resolve(json.content?.[0]?.text ?? '')
          } catch (e) {
            reject(new Error(`Anthropic parse error: ${e.message}`))
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
