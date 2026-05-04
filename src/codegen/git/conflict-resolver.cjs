'use strict'
const fs = require('fs')
const { getProvider } = require('../providers/factory.cjs')

const SYSTEM = `You are a code merge conflict resolver.
You receive a file with Git conflict markers and must pick the correct resolution.
Return ONLY the resolved file content — no explanations, no markdown fences.`

// Resolve all conflict markers in a file using the LLM.
// Returns { resolved: boolean, content: string, conflictsFound: number }
async function resolveConflicts(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const conflicts = countConflicts(raw)
  if (conflicts === 0) return { resolved: false, content: raw, conflictsFound: 0 }

  try {
    const llm = getProvider()
    const prompt = `Resolve all Git conflict markers in this file and return the fully merged content:\n\n${raw}`
    const resolved = await llm.generate(SYSTEM, prompt)
    fs.writeFileSync(filePath, resolved, 'utf8')
    return { resolved: true, content: resolved, conflictsFound: conflicts }
  } catch {
    // Fallback: auto-pick HEAD (ours) side for each conflict
    const fallback = pickOurs(raw)
    fs.writeFileSync(filePath, fallback, 'utf8')
    return { resolved: true, content: fallback, conflictsFound: conflicts, fallback: true }
  }
}

// Resolve conflicts across multiple files (e.g. after a failed merge/pull)
async function resolveConflictsInFiles(filePaths) {
  const results = []
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) continue
    results.push({ filePath, ...(await resolveConflicts(filePath)) })
  }
  return results
}

// Count conflict blocks in text
function countConflicts(text) {
  return (text.match(/^<<<<<<< /gm) || []).length
}

// Fallback: keep HEAD (<<<<<<< ... =======) side, discard theirs
function pickOurs(text) {
  return text.replace(
    /^<<<<<<< .*\n([\s\S]*?)^=======\n[\s\S]*?^>>>>>>> .*\n/gm,
    '$1'
  )
}

// Parse conflict regions for display
function parseConflictRegions(text) {
  const regions = []
  const re = /^<<<<<<< (.*)\n([\s\S]*?)^=======\n([\s\S]*?)^>>>>>>> (.*)\n/gm
  let match
  while ((match = re.exec(text))) {
    regions.push({ oursLabel: match[1], ours: match[2], theirs: match[3], theirsLabel: match[4] })
  }
  return regions
}

module.exports = { resolveConflicts, resolveConflictsInFiles, countConflicts, parseConflictRegions }
