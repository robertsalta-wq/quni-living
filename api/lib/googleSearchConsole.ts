/**
 * Google Search Console (read-only) via OAuth refresh token.
 * Mirrors Unstash Project-Warehouse/api/lib/googleSearchConsole.ts.
 * Env: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN
 */
import { google } from 'googleapis'

/** Domain property - keep in sync with verified Search Console property. */
export const SEARCH_CONSOLE_SITE_URL = 'sc-domain:quni.com.au'

export type SearchConsoleSummaryPayload = {
  clicks28d: number
  impressions28d: number
  avgPosition28d: number
  sitemapUrlsSubmitted: number
  /** Live count from quni.com.au/sitemap.xml (null if fetch failed). */
  sitemapUrlsLive: number | null
  /** Null if the page-dimension count call failed. */
  urlsWithTraffic28d: number | null
  clicks7d: number
  clicksPrev7d: number
}

export type SearchConsoleQueryRow = {
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export type SearchConsolePageRow = {
  pagePath: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  /** Coarse bucket for Quni SEO surfaces. */
  kind: 'campus' | 'university' | 'listing' | 'other'
}

export class SearchConsoleConfigError extends Error {
  readonly code = 'SEARCH_CONSOLE_CONFIG' as const
}

export class SearchConsolePermissionError extends Error {
  readonly code = 'SEARCH_CONSOLE_PERMISSION' as const
}

export class SearchConsoleOAuthRevokedError extends Error {
  readonly code = 'SEARCH_CONSOLE_OAUTH_REVOKED' as const
}

function loadOAuthCredentialsFromEnv(): { clientId: string; clientSecret: string; refreshToken: string } {
  const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim()
  const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim()
  const refreshToken = (process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '').trim()
  if (!clientId || !clientSecret || !refreshToken) {
    throw new SearchConsoleConfigError(
      'OAuth credentials not configured - set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN',
    )
  }
  return { clientId, clientSecret, refreshToken }
}

function mapGoogleError(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e)
  const lower = msg.toLowerCase()
  if (lower.includes('invalid_grant')) {
    return new SearchConsoleOAuthRevokedError(
      'OAuth refresh token expired or revoked - re-run OAuth Playground and update GOOGLE_OAUTH_REFRESH_TOKEN',
    )
  }
  if (
    lower.includes('permission') ||
    lower.includes('not registered') ||
    lower.includes('forbidden') ||
    lower.includes('403')
  ) {
    return new SearchConsolePermissionError(
      'Google account used for OAuth does not have access to sc-domain:quni.com.au (or scope insufficient).',
    )
  }
  return e instanceof Error ? e : new Error(msg)
}

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function rangeEndingYesterday(days: number): { startDate: string; endDate: string } {
  const end = new Date()
  end.setUTCHours(0, 0, 0, 0)
  end.setUTCDate(end.getUTCDate() - 1)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return { startDate: utcYmd(start), endDate: utcYmd(end) }
}

function getWebmasters() {
  const { clientId, clientSecret, refreshToken } = loadOAuthCredentialsFromEnv()
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return google.webmasters({ version: 'v3', auth: oauth2Client })
}

async function queryAggregate(
  webmasters: ReturnType<typeof getWebmasters>,
  startDate: string,
  endDate: string,
): Promise<{ clicks: number; impressions: number; position: number }> {
  try {
    const res = await webmasters.searchanalytics.query({
      siteUrl: SEARCH_CONSOLE_SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: [],
      },
    })
    const row = res.data.rows?.[0]
    if (!row) return { clicks: 0, impressions: 0, position: 0 }
    return {
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      position: row.position ?? 0,
    }
  } catch (e) {
    throw mapGoogleError(e)
  }
}

async function sumSitemapSubmittedUrls(webmasters: ReturnType<typeof getWebmasters>): Promise<number> {
  try {
    const list = await webmasters.sitemaps.list({
      siteUrl: SEARCH_CONSOLE_SITE_URL,
    })
    let sum = 0
    for (const sm of list.data.sitemap ?? []) {
      for (const c of sm.contents ?? []) {
        const n = parseInt(String((c as { submitted?: string }).submitted ?? '0'), 10)
        if (Number.isFinite(n)) sum += n
      }
    }
    return sum
  } catch (e) {
    throw mapGoogleError(e)
  }
}

async function countLiveSitemapUrls(): Promise<number | null> {
  try {
    const origin = (
      process.env.PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      process.env.VITE_SITE_URL ||
      'https://quni.com.au'
    )
      .trim()
      .replace(/\/+$/, '')
    const res = await fetch(`${origin}/sitemap.xml`, {
      headers: { Accept: 'application/xml' },
    })
    if (!res.ok) return null
    const text = await res.text()
    const matches = text.match(/<loc>/g)
    return matches?.length ?? 0
  } catch {
    return null
  }
}

async function countPageUrlsWithImpressions28d(
  webmasters: ReturnType<typeof getWebmasters>,
  range28: { startDate: string; endDate: string },
): Promise<number> {
  const res = await webmasters.searchanalytics.query({
    siteUrl: SEARCH_CONSOLE_SITE_URL,
    requestBody: {
      startDate: range28.startDate,
      endDate: range28.endDate,
      dimensions: ['page'],
      rowLimit: 25000,
    },
  })
  const rows = res.data.rows ?? []
  return rows.filter((row) => (row.impressions ?? 0) >= 1).length
}

export async function fetchSearchConsoleSummaryFromGoogle(): Promise<SearchConsoleSummaryPayload> {
  const webmasters = getWebmasters()

  const range28 = rangeEndingYesterday(28)
  const range7 = rangeEndingYesterday(7)
  const startCurrent7 = new Date(`${range7.startDate}T12:00:00.000Z`)
  const prevEnd = new Date(startCurrent7)
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setUTCDate(prevStart.getUTCDate() - 6)
  const rangePrev7 = { startDate: utcYmd(prevStart), endDate: utcYmd(prevEnd) }

  const [agg28, agg7, aggPrev7, sitemapUrlsSubmitted, sitemapUrlsLive] = await Promise.all([
    queryAggregate(webmasters, range28.startDate, range28.endDate),
    queryAggregate(webmasters, range7.startDate, range7.endDate),
    queryAggregate(webmasters, rangePrev7.startDate, rangePrev7.endDate),
    sumSitemapSubmittedUrls(webmasters),
    countLiveSitemapUrls(),
  ])

  let urlsWithTraffic28d: number | null = null
  try {
    urlsWithTraffic28d = await countPageUrlsWithImpressions28d(webmasters, range28)
  } catch (e) {
    console.error('[googleSearchConsole] urlsWithTraffic28d', e)
  }

  return {
    clicks28d: agg28.clicks,
    impressions28d: agg28.impressions,
    avgPosition28d: Math.round(agg28.position * 10) / 10,
    sitemapUrlsSubmitted,
    sitemapUrlsLive,
    urlsWithTraffic28d,
    clicks7d: agg7.clicks,
    clicksPrev7d: aggPrev7.clicks,
  }
}

export async function fetchTopQueriesFromGoogle(): Promise<SearchConsoleQueryRow[]> {
  const webmasters = getWebmasters()
  const range28 = rangeEndingYesterday(28)
  try {
    const res = await webmasters.searchanalytics.query({
      siteUrl: SEARCH_CONSOLE_SITE_URL,
      requestBody: {
        startDate: range28.startDate,
        endDate: range28.endDate,
        dimensions: ['query'],
        rowLimit: 250,
      },
    })
    const rows = [...(res.data.rows ?? [])].sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0)).slice(0, 10)
    return rows.map((row) => ({
      query: row.keys?.[0] ?? '',
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }))
  } catch (e) {
    throw mapGoogleError(e)
  }
}

export function pageUrlToDisplayPath(raw: string): string {
  const s = raw.trim()
  if (s.startsWith('/')) return s
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`)
    const host = u.hostname.toLowerCase()
    if (host === 'www.quni.com.au' || host === 'quni.com.au') {
      return `${u.pathname}${u.search}` || '/'
    }
    return `${u.pathname}${u.search}` || '/'
  } catch {
    return s.startsWith('/') ? s : `/${s}`
  }
}

export function classifyPagePath(pagePath: string): SearchConsolePageRow['kind'] {
  const p = pagePath.split('?')[0] ?? pagePath
  if (/^\/listings\/[^/]+\/?$/.test(p)) return 'listing'
  if (/^\/student-accommodation\/[^/]+\/[^/]+\/?$/.test(p)) return 'campus'
  if (/^\/student-accommodation\/[^/]+\/?$/.test(p)) return 'university'
  return 'other'
}

export async function fetchTopPagesFromGoogle(): Promise<SearchConsolePageRow[]> {
  const webmasters = getWebmasters()
  const range28 = rangeEndingYesterday(28)
  try {
    const res = await webmasters.searchanalytics.query({
      siteUrl: SEARCH_CONSOLE_SITE_URL,
      requestBody: {
        startDate: range28.startDate,
        endDate: range28.endDate,
        dimensions: ['page'],
        rowLimit: 250,
      },
    })
    const rows = [...(res.data.rows ?? [])].sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0)).slice(0, 10)
    return rows.map((row) => {
      const pagePath = pageUrlToDisplayPath(row.keys?.[0] ?? '')
      return {
        pagePath,
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? 0,
        kind: classifyPagePath(pagePath),
      }
    })
  } catch (e) {
    throw mapGoogleError(e)
  }
}
