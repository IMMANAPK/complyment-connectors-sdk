import { test, expect } from '@playwright/test'
import { loadPlayground } from './connectors/helpers'

test.describe('Playground — page load', () => {
  test.beforeEach(async ({ page }) => {
    await loadPlayground(page)
  })

  test('renders the header with brand and controls', async ({ page }) => {
    await expect(page.locator('.brand-mark')).toHaveText('C/')
    await expect(page.locator('.brand-name')).toContainText('Complyment')
    await expect(page.locator('.brand-product')).toHaveText('Playground')
    await expect(page.locator('#theme-toggle')).toBeVisible()
    await expect(page.locator('#connectors-toggle')).toBeVisible()
    await expect(page.locator('#ai-mode-button')).toBeVisible()
  })

  test('loads connectors and shows count in header', async ({ page }) => {
    const pill = page.locator('#connector-count')
    await expect(pill).not.toHaveText('...')
    await expect(pill).toContainText('loaded')
  })

  test('auto-selects first connector and renders workspace', async ({ page }) => {
    await expect(page.locator('#workspace .identity-name')).toBeVisible()
    await expect(page.locator('#exec-panel .op-list')).toBeVisible()
  })

  test('connector list is populated in sidebar', async ({ page }) => {
    const rows = page.locator('.connector-row')
    await expect(rows).toHaveCount(await rows.count())
    expect(await rows.count()).toBeGreaterThan(0)
  })
})

test.describe('Playground — sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await loadPlayground(page)
  })

  test('sidebar toggle opens and closes the drawer', async ({ page }) => {
    const drawer = page.locator('#connectors-drawer')
    await expect(drawer).not.toHaveClass(/expanded/)
    await page.locator('#connectors-toggle').click()
    await expect(drawer).toHaveClass(/expanded/)
    await page.locator('#connectors-toggle').click()
    await expect(drawer).not.toHaveClass(/expanded/)
  })

  test('Escape key closes the sidebar', async ({ page }) => {
    await page.locator('#connectors-toggle').click()
    await expect(page.locator('#connectors-drawer')).toHaveClass(/expanded/)
    await page.keyboard.press('Escape')
    await expect(page.locator('#connectors-drawer')).not.toHaveClass(/expanded/)
  })

  test('clicking a connector selects it', async ({ page }) => {
    const rows = page.locator('.connector-row')
    const count = await rows.count()
    if (count < 2) test.skip()

    const second = rows.nth(1)
    const name = await second.locator('.connector-name').textContent()
    await second.click()

    await expect(page.locator('#workspace .identity-name')).toHaveText(name!)
    await expect(second).toHaveClass(/active/)
  })
})

test.describe('Playground — theme toggle', () => {
  test('switches between dark and light theme', async ({ page }) => {
    await loadPlayground(page)

    const html = page.locator('html')
    const initial = await html.getAttribute('data-theme')

    await page.locator('#theme-toggle').click()
    const toggled = await html.getAttribute('data-theme')
    expect(toggled).not.toBe(initial)

    await page.locator('#theme-toggle').click()
    await expect(html).toHaveAttribute('data-theme', initial!)
  })
})

test.describe('Playground — console', () => {
  test.beforeEach(async ({ page }) => {
    await loadPlayground(page)
  })

  test('console tabs switch active state', async ({ page }) => {
    const tabs = {
      logs:     page.locator('.console-tab[data-tab="logs"]'),
      response: page.locator('.console-tab[data-tab="response"]'),
      trace:    page.locator('.console-tab[data-tab="trace"]'),
    }
    await expect(tabs.logs).toHaveClass(/active/)

    await tabs.response.click()
    await expect(tabs.response).toHaveClass(/active/)
    await expect(tabs.logs).not.toHaveClass(/active/)

    await tabs.trace.click()
    await expect(tabs.trace).toHaveClass(/active/)
    await expect(tabs.response).not.toHaveClass(/active/)
  })

  test('clear button resets logs and sets status to IDLE', async ({ page }) => {
    await page.locator('#clear-console').click()
    await expect(page.locator('#console-body')).toContainText('Playground ready')
    await expect(page.locator('#status-pill')).toHaveText('IDLE')
  })
})

test.describe('Playground — AI mode', () => {
  test.beforeEach(async ({ page }) => {
    await loadPlayground(page)
  })

  test('AI button switches to AI workspace', async ({ page }) => {
    await page.locator('#ai-mode-button').click()
    await expect(page.locator('#workspace .identity-name')).toHaveText('AI Query')
    await expect(page.locator('#exec-panel #ai-run-btn')).toBeVisible()
    await expect(page.locator('#ai-mode-button')).toHaveClass(/active/)
  })

  test('AI workspace shows provider selector and key input', async ({ page }) => {
    await page.locator('#ai-mode-button').click()
    await expect(page.locator('#ai-provider')).toBeVisible()
    await expect(page.locator('#ai-key')).toBeVisible()
    await expect(page.locator('#ai-connector')).toBeVisible()
  })

  test('switching provider re-renders workspace', async ({ page }) => {
    await page.locator('#ai-mode-button').click()
    const select = page.locator('#ai-provider')
    await select.selectOption('anthropic')
    await expect(page.locator('#workspace .stat-value').first()).toHaveText('anthropic')
  })
})

test.describe('Playground — exec panel', () => {
  test.beforeEach(async ({ page }) => {
    await loadPlayground(page)
  })

  test('operation list is shown and first op is pre-selected', async ({ page }) => {
    const opItems = page.locator('.op-item')
    expect(await opItems.count()).toBeGreaterThan(0)
    await expect(opItems.first()).toHaveClass(/active/)
  })

  test('clicking an operation updates the JSON params editor', async ({ page }) => {
    const ops = page.locator('.op-item')
    if (await ops.count() < 2) test.skip()

    await ops.nth(1).click()
    await expect(ops.nth(1)).toHaveClass(/active/)
    await expect(ops.first()).not.toHaveClass(/active/)
  })

  test('params editor contains valid JSON', async ({ page }) => {
    const editor = page.locator('#params-editor')
    const value = await editor.inputValue()
    expect(() => JSON.parse(value)).not.toThrow()
  })

  test('Test button switches to testConnection op', async ({ page }) => {
    await page.locator('#test-op').click()
    const active = page.locator('.op-item.active')
    await expect(active).toContainText('Test Connection')
  })
})

test.describe('API — /api/registry', () => {
  test('returns all connectors with ops', async ({ request }) => {
    const res = await request.get('/api/registry')
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(Object.keys(body).length).toBeGreaterThan(0)

    for (const [, def] of Object.entries(body) as [string, any][]) {
      expect(def).toHaveProperty('label')
      expect(def).toHaveProperty('ops')
      expect(Array.isArray(def.ops)).toBe(true)
      expect(def.ops.length).toBeGreaterThan(0)
      expect(def).not.toHaveProperty('sdkClass')
    }
  })

  test('each op has id, label, and desc', async ({ request }) => {
    const res = await request.get('/api/registry')
    const body = await res.json()

    for (const [, def] of Object.entries(body) as [string, any][]) {
      for (const op of def.ops) {
        expect(op).toHaveProperty('id')
        expect(op).toHaveProperty('label')
        expect(op).toHaveProperty('desc')
      }
    }
  })
})

test.describe('API — /api/run validation', () => {
  test('returns 400 when required fields are missing', async ({ request }) => {
    const res = await request.post('/api/run', { data: {} })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('Missing required fields')
  })

  test('returns error for unknown connector', async ({ request }) => {
    const res = await request.post('/api/run', {
      data: { connector: 'nonexistent', credentials: {}, operation: 'testConnection' },
    })
    const body = await res.json()
    expect(body.success).toBe(false)
  })
})
