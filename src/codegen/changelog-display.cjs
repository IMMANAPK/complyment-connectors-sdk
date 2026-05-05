'use strict'

function formatChangelog(changelog) {
  if (!changelog?.changes?.length) return changelog?.summary || 'No changes'
  return [
    changelog.summary,
    ...changelog.changes.map(c => `- ${c.severity}: ${c.type} ${c.name} (${c.what})`),
  ].join('\n')
}

module.exports = { formatChangelog }
