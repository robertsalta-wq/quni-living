/**
 * One-off sanity check: production bundle + optional local dev module.
 * Does not print DSN secrets (only host + project id suffix).
 */
import fs from 'node:fs'
import path from 'node:path'

const PROD = 'https://quni.com.au/'
const LOCAL_SENTRY = 'http://localhost:5173/src/lib/sentry.ts'

function summarizeBundle(text, label) {
  const hasIngest = /ingest\.[a-z]+\.sentry\.io/.test(text)
  const hasBrowserTracing =
    text.includes('browserTracingIntegration') || text.includes('BrowserTracing')
  const hasTracesSample = /tracesSampleRate/.test(text)
  const hasReplay = text.includes('replayIntegration') || text.includes('Replay')
  const dsnMatch = text.match(
    /@o(\d+)\.ingest\.([a-z]+)\.sentry\.io\/(\d+)/,
  )
  return {
    label,
    hasIngest,
    hasBrowserTracing,
    hasTracesSample,
    hasReplay,
    sentryProjectHint: dsnMatch
      ? { orgId: dsnMatch[1], region: dsnMatch[2], projectId: dsnMatch[3] }
      : null,
  }
}

async function scanProduction() {
  const res = await fetch(PROD)
  const html = await res.text()
  const assets = [...html.matchAll(/\/assets\/[^"']+\.js/g)].map((m) => m[0])
  const entry = assets.find((a) => /index-[^/]+\.js$/.test(a)) ?? assets[0]
  if (!entry) {
    return { prodStatus: res.status, error: 'no js assets in html', assets: [] }
  }

  const jsRes = await fetch(PROD.replace(/\/$/, '') + entry)
  const js = await jsRes.text()
  const allJs = [js]
  // Scan a few more chunks for sentry (often in vendor or index)
  for (const asset of assets.slice(0, 6)) {
    if (asset === entry) continue
    try {
      const r = await fetch(PROD.replace(/\/$/, '') + asset)
      allJs.push(await r.text())
    } catch {
      /* ignore */
    }
  }
  const combined = allJs.join('\n')
  return {
    prodStatus: res.status,
    entryAsset: entry,
    assetCount: assets.length,
    ...summarizeBundle(combined, 'production-chunks'),
  }
}

async function scanLocalDev() {
  try {
    const res = await fetch(LOCAL_SENTRY)
    if (!res.ok) return { localDev: `unavailable (${res.status})` }
    const text = await res.text()
    return { localDev: summarizeBundle(text, 'local-sentry.ts') }
  } catch (e) {
    return { localDev: `unavailable (${e.message})` }
  }
}

const [prod, local] = await Promise.all([scanProduction(), scanLocalDev()])
console.log(JSON.stringify({ prod, local }, null, 2))
