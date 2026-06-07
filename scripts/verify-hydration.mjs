/**
 * Hydration verification for prerender + main.tsx createRoot/hydrateRoot split.
 * Run after `npm run build` with: node scripts/verify-hydration.mjs
 */
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const PREVIEW_PORT = 4179
const BASE = `http://localhost:${PREVIEW_PORT}`

const ROUTES = [
  {
    name: 'for-universities (prerendered)',
    path: '/for-universities',
    expectPrerender: true,
    expectText: 'A fair, verified place',
  },
  {
    name: 'guide (prerendered)',
    path: '/guides/can-a-landlord-refuse-international-students-australia',
    expectPrerender: true,
    expectHeading: 'What the law actually protects',
  },
  { name: 'homepage', path: '/', expectPrerender: false },
  { name: 'listings', path: '/listings', expectPrerender: false },
  { name: 'privacy (lazy)', path: '/privacy', expectPrerender: false },
  { name: 'student dashboard', path: '/student-dashboard', expectPrerender: false },
]

function isBenignConsoleError(text) {
  return /Failed to load resource: the server responded with a status of 404/i.test(text)
}

function isHydrationMessage(text) {
  return /hydration|did not match|server-rendered HTML|Text content does not match/i.test(text)
}

async function main() {
  const preview = spawn('npx', ['serve', 'dist', '-l', String(PREVIEW_PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  })

  preview.stdout.on('data', (chunk) => {
    process.stdout.write(`[preview] ${chunk}`)
  })
  preview.stderr.on('data', (chunk) => {
    process.stderr.write(`[preview] ${chunk}`)
  })

  let previewReady = false
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch(`${BASE}/`)
      if (res.ok) {
        previewReady = true
        break
      }
    } catch {
      /* retry */
    }
    await delay(250)
  }
  if (!previewReady) {
    preview.kill()
    throw new Error('vite preview did not start in time')
  }

  const browser = await chromium.launch()
  const failures = []

  try {
    for (const route of ROUTES) {
      const page = await browser.newPage()
      const consoleErrors = []
      const consoleWarnings = []

      page.on('console', (msg) => {
        const text = msg.text()
        if (msg.type() === 'error') consoleErrors.push(text)
        if (msg.type() === 'warning') consoleWarnings.push(text)
      })
      page.on('pageerror', (err) => {
        consoleErrors.push(String(err))
      })

      await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await page.waitForTimeout(1500)

      if (route.expectPrerender) {
        if (route.expectHeading) {
          const headingVisible = await page.getByRole('heading', { name: route.expectHeading }).isVisible()
          if (!headingVisible) {
            failures.push(`${route.name}: heading "${route.expectHeading}" not visible after load`)
          }
        }
        if (route.expectText) {
          const textVisible = await page.getByText(route.expectText).isVisible()
          if (!textVisible) {
            failures.push(`${route.name}: text "${route.expectText}" not visible after load`)
          }
        }
      }

      const hydrationIssues = [...consoleErrors, ...consoleWarnings].filter(isHydrationMessage)
      const seriousErrors = consoleErrors.filter((text) => !isBenignConsoleError(text) && !isHydrationMessage(text))
      if (seriousErrors.length > 0) {
        failures.push(`${route.name}: console errors:\n  ${seriousErrors.join('\n  ')}`)
      }
      if (hydrationIssues.length > 0) {
        failures.push(`${route.name}: hydration warnings:\n  ${hydrationIssues.join('\n  ')}`)
      }

      console.log(`OK  ${route.name} (${route.path})`)
      await page.close()
    }
  } finally {
    await browser.close()
    preview.kill()
  }

  if (failures.length > 0) {
    console.error('\nHydration verification FAILED:')
    for (const f of failures) console.error(`- ${f}`)
    process.exit(1)
  }

  console.log('\nHydration verification passed for all routes.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
