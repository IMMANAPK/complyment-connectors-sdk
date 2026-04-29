import { defineConfig, devices } from '@playwright/test'
import { readFileSync } from 'fs'

// Load .env.e2e into process.env if it exists (used by connector real-API tests)
try {
  for (const line of readFileSync('.env.e2e', 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (key && !(key in process.env)) process.env[key] = val
  }
} catch { /* .env.e2e is optional */ }

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://127.0.0.1:4000',
    trace: 'on-first-retry',
    headless: false,
    launchOptions: { slowMo: 1200 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'node playground/server.cjs',
    url: 'http://127.0.0.1:4000',
    reuseExistingServer: true,
    timeout: 15000,
  },
})
