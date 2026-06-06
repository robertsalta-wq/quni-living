/**
 * Smoke-test key routes mount without hydration errors (SPA shell uses createRoot).
 * Requires: npx serve dist -l 4180
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:4180'
const ROUTES = ['/', '/listings/', '/privacy/', '/student-dashboard']

const browser = await chromium.launch()
const failures = []

for (const path of ROUTES) {
  const page = await browser.newPage()
  const errors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err)))

  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.waitForTimeout(1500)

  const hydration = errors.filter((t) =>
    /hydration|did not match|server-rendered HTML|Minified React error #418|#423/i.test(t),
  )
  const serious = errors.filter((t) => !/404|Failed to load resource/i.test(t) && !hydration.some((h) => h === t))

  if (hydration.length) failures.push(`${path}: hydration ${hydration.join('; ')}`)
  if (serious.length) failures.push(`${path}: errors ${serious.join('; ')}`)
  else console.log(`OK ${path}`)

  await page.close()
}

await browser.close()
if (failures.length) {
  console.error('FAILED:', failures)
  process.exit(1)
}
console.log('All SPA routes OK')
