import { Page, expect } from '@playwright/test'

async function injectCursor(page: Page) {
  await page.addInitScript(() => {
    const style = document.createElement('style')
    style.textContent = `
      #__pw_cursor__ {
        position: fixed; width: 24px; height: 24px; border-radius: 50%;
        background: rgba(255, 120, 0, 0.75); border: 2px solid #fff;
        box-shadow: 0 0 6px rgba(0,0,0,0.4);
        pointer-events: none; z-index: 2147483647;
        transform: translate(-50%, -50%);
        transition: left 80ms linear, top 80ms linear;
        display: none;
      }
      @keyframes __pw_click__ {
        0%   { transform: translate(-50%,-50%) scale(1); opacity: 0.8; }
        100% { transform: translate(-50%,-50%) scale(2.5); opacity: 0; }
      }
      .pw-click-flash {
        position: fixed; width: 36px; height: 36px; border-radius: 50%;
        background: rgba(255, 120, 0, 0.6); pointer-events: none;
        z-index: 2147483646; transform: translate(-50%,-50%);
        animation: __pw_click__ 0.4s ease-out forwards;
      }
    `
    document.addEventListener('DOMContentLoaded', () => {
      document.head.appendChild(style)
      const cursor = document.createElement('div')
      cursor.id = '__pw_cursor__'
      document.body.appendChild(cursor)

      document.addEventListener('mousemove', (e) => {
        cursor.style.display = 'block'
        cursor.style.left = e.clientX + 'px'
        cursor.style.top  = e.clientY + 'px'
      })

      document.addEventListener('mousedown', (e) => {
        const flash = document.createElement('div')
        flash.className = 'pw-click-flash'
        flash.style.left = e.clientX + 'px'
        flash.style.top  = e.clientY + 'px'
        document.body.appendChild(flash)
        flash.addEventListener('animationend', () => flash.remove())
      })
    })
  })
}

export async function loadPlayground(page: Page) {
  await injectCursor(page)
  await page.goto('/')
  await expect(page.locator('#connector-count')).not.toHaveText('...')
}

export async function selectConnector(page: Page, connectorId: string) {
  await page.locator('#connectors-toggle').click()
  await page.locator(`[data-connector="${connectorId}"]`).click()
  await expect(page.locator('#exec-panel .op-list')).toBeVisible()
}

export async function fillCredentials(page: Page, creds: Record<string, string>) {
  for (const [key, value] of Object.entries(creds)) {
    await page.locator(`#cred-${key}`).fill(value)
  }
}

export async function runOperation(page: Page, opId: string) {
  await page.locator(`.op-item[data-op="${opId}"]`).click()
  await page.locator('#run-btn').click()
  // wait for status pill to leave EXEC state
  await expect(page.locator('#status-pill')).not.toHaveText('EXEC', { timeout: 30000 })
}

export async function getResult(page: Page) {
  await page.locator('.console-tab[data-tab="response"]').click()
  const body = page.locator('#console-body')
  await expect(body).not.toContainText('No response yet')
  return body
}

export async function assertSuccess(page: Page) {
  // Switch to response tab first so we can read the error if the assertion fails
  await page.locator('.console-tab[data-tab="response"]').click()
  const body = page.locator('#console-body')
  await expect(body).not.toContainText('No response yet')

  const responseText = await body.textContent() ?? ''

  // Extract error field from response for a readable failure message
  const errorMatch = responseText.match(/"error"\s*:\s*"([^"]+)"/)
  const errorHint = errorMatch ? `\n\nAPI error: ${errorMatch[1]}` : ''

  await expect(
    page.locator('#status-pill'),
    `Expected 200 OK but got ERR.${errorHint}`
  ).toHaveText('200 OK')

  await expect(body).toContainText('"success": true')
}

export async function assertError(page: Page) {
  const result = await getResult(page)
  await expect(result).toContainText('"success": false')
}

export async function runWithParams(page: Page, opId: string, params: Record<string, unknown>) {
  await page.locator(`.op-item[data-op="${opId}"]`).click()
  await page.locator('#params-editor').fill(JSON.stringify(params, null, 2))
  await page.locator('#run-btn').click()
  await expect(page.locator('#status-pill')).not.toHaveText('EXEC', { timeout: 30000 })
}

export async function getResponseData(page: Page): Promise<any> {
  await page.locator('.console-tab[data-tab="response"]').click()
  await expect(page.locator('#console-body')).not.toContainText('No response yet', { timeout: 5000 })
  return page.evaluate(() => (window as any).__playgroundLastResult ?? null)
}
