async function readJSON(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || `Request failed with ${response.status}`)
  }
  return data
}

export async function loadRegistry() {
  return readJSON(await fetch('/api/registry'))
}

export async function runConnectorOperation({ connector, credentials, operation, params }) {
  return readJSON(await fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connector, credentials, operation, params }),
  }))
}

export async function runAIRequest({ provider, apiKey, connectorId, credentials, query }) {
  return readJSON(await fetch('/api/ai/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, apiKey, connectorId, credentials, query }),
  }))
}
