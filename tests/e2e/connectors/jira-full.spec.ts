import { test } from '@playwright/test'
import {
  assertSuccess,
  fillCredentials,
  getResponseData,
  loadPlayground,
  runOperation,
  runWithParams,
  selectConnector,
} from './helpers'

// ── Credentials ───────────────────────────────────────────────────────────────
const creds = {
  baseUrl:  process.env.JIRA_BASE_URL  ?? '',
  email:    process.env.JIRA_EMAIL     ?? '',
  apiToken: process.env.JIRA_API_TOKEN ?? '',
}
const hasCredentials = Object.values(creds).every(Boolean)

// ── Shared state — fully auto-discovered, no env vars required ────────────────
const state = {
  projectKey:        '',
  boardId:           0,
  createdIssueKey:   '',
  bulkIssueKeys:     [] as string[],
  securityTicketKey: '',
  transitionId:      '',
}

// ── Auto-discovery — runs once before all tests ───────────────────────────────
// Discovers projectKey and boardId directly from the Jira API so no extra
// env vars are needed. Tests then flow sequentially and populate the rest.
test.describe('Jira — full API suite', () => {
  test.skip(!hasCredentials, 'Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN in .env.e2e')

  test.beforeAll(async () => {
    if (!hasCredentials) return
    const auth = 'Basic ' + Buffer.from(`${creds.email}:${creds.apiToken}`).toString('base64')
    const headers = { Authorization: auth, 'Content-Type': 'application/json' }

    // Discover first available project key
    const projectRes = await fetch(`${creds.baseUrl}/rest/api/3/project/search`, { headers })
    if (projectRes.ok) {
      const data = await projectRes.json() as any
      state.projectKey = data.values?.[0]?.key ?? ''
    }

    // Discover first available board ID (Jira Software / Agile)
    const boardRes = await fetch(`${creds.baseUrl}/rest/agile/1.0/board`, { headers })
    if (boardRes.ok) {
      const data = await boardRes.json() as any
      state.boardId = data.values?.[0]?.id ?? 0
    }
  })

  test.beforeEach(async ({ page }) => {
    await loadPlayground(page)
    await selectConnector(page, 'jira')
    await fillCredentials(page, creds)
  })

  // ── 1. Connection ─────────────────────────────────────────────────────────
  test('01 · testConnection', async ({ page }) => {
    await runOperation(page, 'testConnection')
    await assertSuccess(page)
  })

  // ── 2. Projects ───────────────────────────────────────────────────────────
  test('02 · getProjects', async ({ page }) => {
    await runOperation(page, 'getProjects')
    await assertSuccess(page)
  })

  test('03 · getProjectByKey', async ({ page }) => {
    await runWithParams(page, 'getProjectByKey', { projectKey: state.projectKey })
    await assertSuccess(page)
  })

  // ── 3. Issues (read) ──────────────────────────────────────────────────────
  test('04 · getIssues', async ({ page }) => {
    await runWithParams(page, 'getIssues', { projectKey: state.projectKey, maxResults: 5 })
    await assertSuccess(page)
  })

  // ── 4. Create ─────────────────────────────────────────────────────────────
  test('05 · createIssue', async ({ page }) => {
    await runWithParams(page, 'createIssue', {
      projectKey:  state.projectKey,
      summary:     '[Playwright] Automated test issue',
      issueType:   'Bug',
      description: 'Created by Playwright e2e test suite. Safe to delete.',
      priority:    'Low',
    })
    await assertSuccess(page)
    const data = await getResponseData(page)
    state.createdIssueKey = data?.data?.key ?? ''
  })

  // ── 5. Read created issue ─────────────────────────────────────────────────
  test('06 · getIssueByKey', async ({ page }) => {
    await runWithParams(page, 'getIssueByKey', { issueKey: state.createdIssueKey })
    await assertSuccess(page)
  })

  // ── 6. Update ─────────────────────────────────────────────────────────────
  test('07 · updateIssue', async ({ page }) => {
    await runWithParams(page, 'updateIssue', {
      issueKey: state.createdIssueKey,
      summary:  '[Playwright] Updated by e2e test',
      priority: 'Medium',
    })
    await assertSuccess(page)
  })

  // ── 7. Comments ───────────────────────────────────────────────────────────
  test('08 · addComment', async ({ page }) => {
    await runWithParams(page, 'addComment', {
      issueKey: state.createdIssueKey,
      body:     'Playwright e2e comment — automated test.',
    })
    await assertSuccess(page)
  })

  test('09 · getComments', async ({ page }) => {
    await runWithParams(page, 'getComments', { issueKey: state.createdIssueKey })
    await assertSuccess(page)
  })

  // ── 8. Transitions ────────────────────────────────────────────────────────
  test('10 · getTransitions', async ({ page }) => {
    await runWithParams(page, 'getTransitions', { issueKey: state.createdIssueKey })
    await assertSuccess(page)
    const data = await getResponseData(page)
    state.transitionId = data?.data?.[0]?.id ?? ''
  })

  test('11 · transitionIssue', async ({ page }) => {
    await runWithParams(page, 'transitionIssue', {
      issueKey:     state.createdIssueKey,
      transitionId: state.transitionId,
    })
    await assertSuccess(page)
  })

  // ── 9. Bulk create ────────────────────────────────────────────────────────
  test('12 · bulkCreateIssues', async ({ page }) => {
    await runWithParams(page, 'bulkCreateIssues', {
      requests: [
        { projectKey: state.projectKey, summary: '[Playwright] Bulk issue 1', issueType: 'Task' },
        { projectKey: state.projectKey, summary: '[Playwright] Bulk issue 2', issueType: 'Task' },
      ],
    })
    await assertSuccess(page)
    const data = await getResponseData(page)
    state.bulkIssueKeys = (data?.data ?? []).map((i: any) => i.key).filter(Boolean)
  })

  // ── 10. Security ticket ───────────────────────────────────────────────────
  test('13 · createSecurityTicket', async ({ page }) => {
    await runWithParams(page, 'createSecurityTicket', {
      projectKey:  state.projectKey,
      title:       'Test vulnerability',
      description: 'Playwright e2e security ticket test.',
      severity:    'high',
      source:      'playwright',
    })
    await assertSuccess(page)
    const data = await getResponseData(page)
    state.securityTicketKey = data?.data?.key ?? ''
  })

  // ── 11. Sprints — skipped only if this Jira has no boards (no Agile license) ─
  test('14 · getSprints', async ({ page }) => {
    test.skip(state.boardId === 0, 'No Agile boards found in this Jira instance')
    await runWithParams(page, 'getSprints', { boardId: state.boardId })
    await assertSuccess(page)
  })

  test('15 · getActiveSprint', async ({ page }) => {
    test.skip(state.boardId === 0, 'No Agile boards found in this Jira instance')
    await runWithParams(page, 'getActiveSprint', { boardId: state.boardId })
    await assertSuccess(page)
  })

  // ── 12. Cleanup ───────────────────────────────────────────────────────────
  test('16 · deleteIssue — created issue', async ({ page }) => {
    await runWithParams(page, 'deleteIssue', { issueKey: state.createdIssueKey })
    await assertSuccess(page)
  })

  test('17 · deleteIssue — bulk issues', async ({ page }) => {
    for (const key of state.bulkIssueKeys) {
      await runWithParams(page, 'deleteIssue', { issueKey: key })
      await assertSuccess(page)
    }
  })

  test('18 · deleteIssue — security ticket', async ({ page }) => {
    await runWithParams(page, 'deleteIssue', { issueKey: state.securityTicketKey })
    await assertSuccess(page)
  })
})
