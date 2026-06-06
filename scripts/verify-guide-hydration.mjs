/**
 * Quick guide-route hydration check. Requires: npx serve dist -l 4180 (running separately).
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:4180'
const path = '/guides/can-a-landlord-refuse-international-students-australia'

const browser = await chromium.launch()
const page = await browser.newPage()
const errors = []
const warnings = []

page.on('console', (msg) => {
  const text = msg.text()
  if (msg.type() === 'error') errors.push(text)
  if (msg.type() === 'warning') warnings.push(text)
})
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
await page.waitForTimeout(2000)

const hydration = [...errors, ...warnings].filter((t) =>
  /hydration|did not match|server-rendered HTML|Text content does not match|Minified React error #418|#423/i.test(t),
)

console.log('article visible:', await page.getByRole('heading', { name: 'What the law actually protects' }).isVisible())
console.log('hydration issues:', hydration.length ? hydration : 'none')
console.log('other errors:', errors.filter((t) => !/404|Failed to load resource/i.test(t)))

await browser.close()
process.exit(hydration.length > 0 ? 1 : 0)
