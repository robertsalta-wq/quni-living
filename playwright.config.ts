import dotenv from 'dotenv'
import { defineConfig, devices } from '@playwright/test'

dotenv.config({ path: '.env.vercel' })
dotenv.config({ path: '.env.local' })

const baseURL = (process.env.BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 120_000,
  expect: { timeout: 60_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
