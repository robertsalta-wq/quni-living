/**
 * Google Search Console (read-only) via OAuth refresh token.
 * Mirrors Unstash Project-Warehouse/api/lib/googleSearchConsole.ts.
 * Env: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN
 */
import { google } from 'googleapis'

/** Domain property - keep in sync with verified Search Console property. */
export const SEARCH_CONSOLE_SITE_URL = 'sc-domain:quni.com.au'

/** Enough rows that the top-10 by impressions is not an arbitrary slice. */
const SEARCH_ANALYTICS_ROW_LIMIT = 250
/** Rows returned to the admin UI (client may re-sort within this set). */
const TOP_ROWS_RETURNED = 100

export type SearchConsoleSummaryPayload = {
  clicks28d: number
  impressions28d: number
  avgPosition28d: number
  sitemapUrlsSubmitted: number
  /** Live count from quni.com.au/sitemap.xml (null if fetch failed). */
  sitemapUrlsLive: number | null
  /** Null if the page-dimension count call failed. Deduped after www/scheme normalise. */
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

export type SearchConsolePageKind =
  | 'home'
  | 'accommodation'
  | 'campus'
  | 'university'
  | 'listings'
  | 'guide'
  | 'landlord'
  | 'universities'
  | 'audience'
  | 'company'
  | 'other'

export type SearchConsolePageRow = {
  pagePath: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  kind: SearchConsolePageKind
  /** Original GSC page URL(s) before www/scheme normalisation (for hover). */
  sourceUrls: string[]
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

type AnalyticsRow = {
  keys?: string[] | null
  clicks?: number | null
  impressions?: number | null
  ctr?: number | null
  position?: number | null
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

/** Impressions desc, then clicks desc. */
export function compareByImpressionsThenClicks(
  a: { impressions: number; clicks: number },
  b: { impressions: number; clicks: number },
): number {
  if (b.impressions !== a.impressions) return b.impressions - a.impressions
  return b.clicks - a.clicks
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

/**
 * Strip scheme + leading www, keep path (+ search). Apex and www collapse to the same key.
 */
export function pageUrlToDisplayPath(raw: string): string {
  const s = raw.trim()
  if (!s) return '/'
  if (s.startsWith('/')) {
    const path = s.split('?')[0] || '/'
    return path === '' ? '/' : path.replace(/\/+$/, '') || '/'
  }
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`)
    let path = u.pathname || '/'
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
    return path || '/'
  } catch {
    const path = (s.startsWith('/') ? s : `/${s}`).split('?')[0] || '/'
    return path.replace(/\/+$/, '') || '/'
  }
}

export function classifyPagePath(pagePath: string): SearchConsolePageKind {
  const p = (pagePath.split('?')[0] ?? pagePath).replace(/\/+$/, '') || '/'

  if (p === '/') return 'home'

  // Bare index before campus/uni hubs (longer prefixes of the same path).
  if (p === '/student-accommodation') return 'accommodation'
  if (/^\/student-accommodation\/[^/]+\/[^/]+$/.test(p)) return 'campus'
  if (/^\/student-accommodation\/[^/]+$/.test(p)) return 'university'

  if (p === '/listings' || p.startsWith('/listings/')) return 'listings'
  if (p === '/guides' || p.startsWith('/guides/')) return 'guide'

  if (
    p === '/for-landlords' ||
    p.startsWith('/landlords/') ||
    p.startsWith('/landlord-') ||
    p.startsWith('/services/')
  ) {
    return 'landlord'
  }

  if (p === '/for-universities') return 'universities'

  if (p === '/international' || p === '/rent-near-campus') return 'audience'

  if (
    p === '/about' ||
    p === '/faq' ||
    p === '/contact' ||
    p === '/verification' ||
    p === '/terms' ||
    p === '/privacy' ||
    p === '/refunds' ||
    p === '/non-discrimination'
  ) {
    return 'company'
  }

  return 'other'
}

type AccPage = {
  pagePath: string
  clicks: number
  impressions: number
  positionWeightedSum: number
  sourceUrls: string[]
}

/** Aggregate GSC page rows after www/scheme normalisation (impression-weighted position). */
export function aggregatePageAnalyticsRows(rows: AnalyticsRow[]): SearchConsolePageRow[] {
  const byPath = new Map<string, AccPage>()

  for (const row of rows) {
    const rawUrl = (row.keys?.[0] ?? '').trim()
    if (!rawUrl) continue
    const pagePath = pageUrlToDisplayPath(rawUrl)
    const clicks = row.clicks ?? 0
    const impressions = row.impressions ?? 0
    const position = row.position ?? 0
    const existing = byPath.get(pagePath)
    if (!existing) {
      byPath.set(pagePath, {
        pagePath,
        clicks,
        impressions,
        positionWeightedSum: position * impressions,
        sourceUrls: [rawUrl],
      })
      continue
    }
    existing.clicks += clicks
    existing.impressions += impressions
    existing.positionWeightedSum += position * impressions
    if (!existing.sourceUrls.includes(rawUrl)) existing.sourceUrls.push(rawUrl)
  }

  const out: SearchConsolePageRow[] = []
  for (const acc of byPath.values()) {
    const position =
      acc.impressions > 0 ? Math.round((acc.positionWeightedSum / acc.impressions) * 10) / 10 : 0
    const ctr = acc.impressions > 0 ? acc.clicks / acc.impressions : 0
    out.push({
      pagePath: acc.pagePath,
      clicks: acc.clicks,
      impressions: acc.impressions,
      ctr,
      position,
      kind: classifyPagePath(acc.pagePath),
      sourceUrls: acc.sourceUrls,
    })
  }

  return out.sort(compareByImpressionsThenClicks)
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
  const aggregated = aggregatePageAnalyticsRows(res.data.rows ?? [])
  return aggregated.filter((row) => row.impressions >= 1).length
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
        rowLimit: SEARCH_ANALYTICS_ROW_LIMIT,
      },
    })
    const rows = [...(res.data.rows ?? [])]
      .map((row) => ({
        query: row.keys?.[0] ?? '',
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? 0,
      }))
      .sort(compareByImpressionsThenClicks)
      .slice(0, TOP_ROWS_RETURNED)
    return rows
  } catch (e) {
    throw mapGoogleError(e)
  }
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
        rowLimit: SEARCH_ANALYTICS_ROW_LIMIT,
      },
    })
    return aggregatePageAnalyticsRows(res.data.rows ?? []).slice(0, TOP_ROWS_RETURNED)
  } catch (e) {
    throw mapGoogleError(e)
  }
}
