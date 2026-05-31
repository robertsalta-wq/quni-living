/**
 * Headless check: load production, wait for Sentry ingest requests.
 * Requires: npx playwright (downloads browser on first run).
 */
import { chromium } from 'playwright-core'
import { URL as NodeURL } from 'node:url'

const START_URL = process.env.CHECK_URL ?? 'https://quni-living.vercel.app/listings'
const TIMEOUT_MS = 25_000

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const ingest = []

page.on('request', (req) => {
  const u = req.url()
  if (u.includes('sentry.io') || u.includes('ingest.')) {
    const parsed = new NodeURL(u)
    ingest.push({ method: req.method(), host: parsed.host, path: parsed.pathname.slice(0, 80) })
  }
})

let navError = null
try {
  await page.goto(START_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS })
  await page.waitForTimeout(3000)
  await page.goto('https://quni-living.vercel.app/', { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS })
  await page.waitForTimeout(2000)
} catch (e) {
  navError = String(e.message)
}

await browser.close()
const ok = ingest.length > 0
console.log(
  JSON.stringify(
    {
      ok,
      url: START_URL,
      navError,
      ingestRequestCount: ingest.length,
      ingestHosts: [...new Set(ingest.map((r) => r.host))],
      ingestMethods: [...new Set(ingest.map((r) => r.method))],
      sample: ingest.slice(0, 8),
    },
    null,
    2,
  ),
)
if (!ok) process.exit(1)
