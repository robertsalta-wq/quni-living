import { useCallback, useEffect, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { AdminPageHeader, Card } from '../../components/admin/primitives'
import { apiUrl } from '../../lib/apiUrl'
import { getValidAccessTokenForFunctions } from '../../lib/supabaseEdgeInvoke'

const GSC_RESOURCE_ID = encodeURIComponent('sc-domain:quni.com.au')
const LINK_SEARCH_CONSOLE = `https://search.google.com/search-console?resource_id=${GSC_RESOURCE_ID}`
const LINK_COVERAGE = `https://search.google.com/search-console/index?resource_id=${GSC_RESOURCE_ID}`
const LINK_SITEMAPS = `https://search.google.com/search-console/sitemaps?resource_id=${GSC_RESOURCE_ID}`

const SITEMAP_TOOLTIP =
  'URLs Google reports from submitted sitemaps. Not the same as pages indexed - see Coverage in Search Console.'

const LIVE_SITEMAP_TOOLTIP =
  'Count of <loc> entries currently returned by https://quni.com.au/sitemap.xml (live API).'

const URLS_WITH_TRAFFIC_TOOLTIP =
  'Distinct pages with at least 1 impression in the last 28 days. Not the same as indexed pages.'

type SummaryPayload = {
  clicks28d: number
  impressions28d: number
  avgPosition28d: number
  sitemapUrlsSubmitted: number
  sitemapUrlsLive: number | null
  urlsWithTraffic28d: number | null
  clicks7d: number
  clicksPrev7d: number
}

type QueryRow = {
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

type PageRow = {
  pagePath: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  kind: 'campus' | 'university' | 'listing' | 'other'
}

type ApiBody<T> = { ok: true; data: T; cached?: boolean } | { ok: false; error?: string; code?: string }

function fmtInt(n: number) {
  return new Intl.NumberFormat('en-AU').format(n)
}

function fmtPct(ratio: number) {
  return `${(ratio * 100).toFixed(1)}%`
}

function kindLabel(kind: PageRow['kind']) {
  switch (kind) {
    case 'campus':
      return 'Campus'
    case 'university':
      return 'Uni hub'
    case 'listing':
      return 'Listing'
    default:
      return 'Other'
  }
}

function clicksDelta(summary: SummaryPayload): string | null {
  const cur = summary.clicks7d
  const prev = summary.clicksPrev7d
  if (prev <= 0 && cur <= 0) return null
  if (prev <= 0) return '+100% vs prior 7d'
  const pct = ((cur - prev) / prev) * 100
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(0)}% vs prior 7d`
}

export default function AdminSearch() {
  const [token, setToken] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const [summary, setSummary] = useState<
    | { status: 'loading' }
    | { status: 'ok'; data: SummaryPayload }
    | { status: 'error'; message: string }
  >({ status: 'loading' })
  const [queries, setQueries] = useState<
    | { status: 'loading' }
    | { status: 'ok'; data: QueryRow[] }
    | { status: 'error'; message: string }
  >({ status: 'loading' })
  const [pages, setPages] = useState<
    | { status: 'loading' }
    | { status: 'ok'; data: PageRow[] }
    | { status: 'error'; message: string }
  >({ status: 'loading' })

  const [refreshBusy, setRefreshBusy] = useState(false)

  const loadAll = useCallback(async (accessToken: string, signal: AbortSignal, refresh: boolean) => {
    const q = refresh ? '?refresh=1' : ''
    const headers = { Authorization: `Bearer ${accessToken}` }

    setSummary({ status: 'loading' })
    setQueries({ status: 'loading' })
    setPages({ status: 'loading' })

    const fetchJson = async <T,>(path: string): Promise<ApiBody<T>> => {
      const res = await fetch(apiUrl(path), { headers, signal })
      let body: ApiBody<T>
      try {
        body = (await res.json()) as ApiBody<T>
      } catch {
        return { ok: false, error: `Request failed (${res.status})` }
      }
      if (!res.ok || body.ok === false) {
        const msg =
          body.ok === false ? (body.error ?? `Request failed (${res.status})`) : `Request failed (${res.status})`
        return { ok: false, error: msg }
      }
      return body
    }

    try {
      const [sumR, qR, pR] = await Promise.all([
        fetchJson<SummaryPayload>(`/api/admin/search-console/summary${q}`),
        fetchJson<QueryRow[]>(`/api/admin/search-console/queries${q}`),
        fetchJson<PageRow[]>(`/api/admin/search-console/pages${q}`),
      ])

      if (signal.aborted) return

      if (sumR.ok === true) {
        setSummary({ status: 'ok', data: sumR.data })
      } else {
        setSummary({
          status: 'error',
          message: (sumR.ok === false ? sumR.error : undefined) || 'Could not load summary.',
        })
      }

      if (qR.ok === true) {
        setQueries({ status: 'ok', data: qR.data })
      } else {
        setQueries({
          status: 'error',
          message: (qR.ok === false ? qR.error : undefined) || 'Could not load queries.',
        })
      }

      if (pR.ok === true) {
        setPages({ status: 'ok', data: pR.data })
      } else {
        setPages({
          status: 'error',
          message: (pR.ok === false ? pR.error : undefined) || 'Could not load pages.',
        })
      }
    } catch (e) {
      if (signal.aborted) return
      const msg = e instanceof Error ? e.message : 'Could not reach Search Console API.'
      setSummary({ status: 'error', message: msg })
      setQueries({ status: 'error', message: msg })
      setPages({ status: 'error', message: msg })
    }
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    void (async () => {
      setAuthError(null)
      try {
        const auth = await getValidAccessTokenForFunctions()
        if ('error' in auth) {
          setToken(null)
          setAuthError(auth.error)
          setSummary({ status: 'error', message: auth.error })
          setQueries({ status: 'error', message: auth.error })
          setPages({ status: 'error', message: auth.error })
          return
        }
        setToken(auth.token)
        await loadAll(auth.token, ac.signal, false)
      } catch (e) {
        if (ac.signal.aborted) return
        console.error(e)
        setAuthError('Could not load session.')
        setSummary({ status: 'error', message: 'Could not load session.' })
        setQueries({ status: 'error', message: 'Could not load session.' })
        setPages({ status: 'error', message: 'Could not load session.' })
      }
    })()
    return () => ac.abort()
  }, [loadAll])

  const onRefresh = useCallback(async () => {
    if (!token) return
    const ac = new AbortController()
    setRefreshBusy(true)
    try {
      await loadAll(token, ac.signal, true)
    } finally {
      setRefreshBusy(false)
    }
  }, [token, loadAll])

  const onRetry = useCallback(() => {
    if (!token) return
    const ac = new AbortController()
    void loadAll(token, ac.signal, false)
  }, [token, loadAll])

  const summaryLoading = summary.status === 'loading'
  const summaryErr = summary.status === 'error' ? summary.message : null
  const summaryOk = summary.status === 'ok' ? summary.data : null
  const delta = summaryOk ? clicksDelta(summaryOk) : null
  const sitemapMismatch =
    summaryOk &&
    typeof summaryOk.sitemapUrlsLive === 'number' &&
    summaryOk.sitemapUrlsSubmitted > 0 &&
    Math.abs(summaryOk.sitemapUrlsLive - summaryOk.sitemapUrlsSubmitted) > 5

  return (
    <div className="w-full min-w-0 space-y-6">
      <AdminPageHeader
        title="Search"
        subtitle="Read-only Google Search Console snapshot for quni.com.au. Data typically lags 2-3 days."
        actions={
          <button
            type="button"
            disabled={!token || refreshBusy}
            className="rounded-admin-md border border-admin-line bg-admin-surface-1 px-4 py-2 text-sm font-semibold text-admin-ink-2 hover:bg-admin-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void onRefresh()}
          >
            {refreshBusy ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {authError ? <p className="text-sm text-admin-danger-fg">{authError}</p> : null}

      {summaryErr ? (
        <div className="rounded-admin-md border border-admin-danger/30 bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger-fg">
          <p className="font-medium">Could not load summary</p>
          <p className="mt-1">{summaryErr}</p>
          <button
            type="button"
            className="mt-3 rounded-admin-sm border border-admin-danger/40 bg-white px-3 py-1.5 text-sm font-semibold text-admin-danger-fg hover:bg-admin-danger-bg"
            onClick={() => onRetry()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {sitemapMismatch ? (
        <p className="rounded-admin-md border border-admin-warning/40 bg-admin-warning-bg px-4 py-3 text-sm text-admin-warning-fg">
          Live sitemap ({fmtInt(summaryOk!.sitemapUrlsLive!)}) and GSC submitted count (
          {fmtInt(summaryOk!.sitemapUrlsSubmitted)}) differ. Check sitemap submission in Search Console.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6">
        {summaryLoading ? (
          <>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-[110px] animate-pulse rounded-admin-md border border-admin-line bg-admin-surface-2"
              />
            ))}
          </>
        ) : (
          <>
            <MetricCard
              label="Clicks (28d)"
              value={summaryOk ? fmtInt(summaryOk.clicks28d) : '-'}
              hint={delta}
              warn={!!summaryErr && !summaryOk}
            />
            <MetricCard
              label="Impressions (28d)"
              value={summaryOk ? fmtInt(summaryOk.impressions28d) : '-'}
              warn={!!summaryErr && !summaryOk}
            />
            <MetricCard
              label="Avg position (28d)"
              value={summaryOk ? summaryOk.avgPosition28d.toFixed(1) : '-'}
              warn={!!summaryErr && !summaryOk}
            />
            <MetricCard
              label="Sitemap (GSC)"
              value={summaryOk ? fmtInt(summaryOk.sitemapUrlsSubmitted) : '-'}
              tooltip={SITEMAP_TOOLTIP}
              warn={!!summaryErr && !summaryOk}
            />
            <MetricCard
              label="Sitemap (live)"
              value={
                summaryOk && typeof summaryOk.sitemapUrlsLive === 'number'
                  ? fmtInt(summaryOk.sitemapUrlsLive)
                  : '-'
              }
              tooltip={LIVE_SITEMAP_TOOLTIP}
              warn={!!summaryErr && !summaryOk}
            />
            <MetricCard
              label="URLs with traffic (28d)"
              value={
                summaryOk && typeof summaryOk.urlsWithTraffic28d === 'number'
                  ? fmtInt(summaryOk.urlsWithTraffic28d)
                  : '-'
              }
              tooltip={URLS_WITH_TRAFFIC_TOOLTIP}
              warn={!!summaryErr && !summaryOk}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding={20}>
          <h2 className="text-sm font-semibold text-admin-ink-2">Top queries (28d)</h2>
          {queries.status === 'loading' ? (
            <div className="mt-4 h-48 animate-pulse rounded-admin-sm bg-admin-surface-2" />
          ) : queries.status === 'error' ? (
            <p className="mt-3 text-sm text-admin-danger-fg">{queries.message}</p>
          ) : queries.data.length === 0 ? (
            <p className="mt-3 text-sm text-admin-ink-4">No query data for this period.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-admin-line text-admin-ink-4">
                    <th className="py-2 pr-3 font-medium">Query</th>
                    <th className="py-2 pr-3 font-medium">Clicks</th>
                    <th className="py-2 pr-3 font-medium">Impr.</th>
                    <th className="py-2 pr-3 font-medium">CTR</th>
                    <th className="py-2 font-medium">Pos</th>
                  </tr>
                </thead>
                <tbody>
                  {queries.data.map((row, i) => (
                    <tr key={`${row.query}-${i}`} className="border-b border-admin-line/60">
                      <td className="max-w-[200px] truncate py-2 pr-3 font-medium text-admin-ink-2">{row.query}</td>
                      <td className="py-2 pr-3 tabular-nums">{fmtInt(row.clicks)}</td>
                      <td className="py-2 pr-3 tabular-nums">{fmtInt(row.impressions)}</td>
                      <td className="py-2 pr-3 tabular-nums">{fmtPct(row.ctr)}</td>
                      <td className="py-2 tabular-nums">{row.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card padding={20}>
          <h2 className="text-sm font-semibold text-admin-ink-2">Top pages (28d)</h2>
          {pages.status === 'loading' ? (
            <div className="mt-4 h-48 animate-pulse rounded-admin-sm bg-admin-surface-2" />
          ) : pages.status === 'error' ? (
            <p className="mt-3 text-sm text-admin-danger-fg">{pages.message}</p>
          ) : pages.data.length === 0 ? (
            <p className="mt-3 text-sm text-admin-ink-4">No page data for this period.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-admin-line text-admin-ink-4">
                    <th className="py-2 pr-3 font-medium">Page</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 font-medium">Clicks</th>
                    <th className="py-2 pr-3 font-medium">Impr.</th>
                    <th className="py-2 pr-3 font-medium">CTR</th>
                    <th className="py-2 font-medium">Pos</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.data.map((row, i) => (
                    <tr key={`${row.pagePath}-${i}`} className="border-b border-admin-line/60">
                      <td className="max-w-[220px] break-all py-2 pr-3 font-medium text-admin-ink-2">
                        {row.pagePath}
                      </td>
                      <td className="py-2 pr-3 text-admin-ink-4">{kindLabel(row.kind)}</td>
                      <td className="py-2 pr-3 tabular-nums">{fmtInt(row.clicks)}</td>
                      <td className="py-2 pr-3 tabular-nums">{fmtInt(row.impressions)}</td>
                      <td className="py-2 pr-3 tabular-nums">{fmtPct(row.ctr)}</td>
                      <td className="py-2 tabular-nums">{row.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="border-t border-admin-line pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-admin-ink-4">Quick links</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <a
            href={LINK_SEARCH_CONSOLE}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-admin-coral hover:underline"
          >
            Open in Google Search Console
          </a>
          <a href={LINK_COVERAGE} target="_blank" rel="noreferrer" className="font-medium text-admin-coral hover:underline">
            View indexing coverage
          </a>
          <a href={LINK_SITEMAPS} target="_blank" rel="noreferrer" className="font-medium text-admin-coral hover:underline">
            View sitemap status
          </a>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  hint,
  tooltip,
  warn,
}: {
  label: string
  value: string
  hint?: string | null
  tooltip?: string
  warn?: boolean
}) {
  return (
    <Card padding={20} className={warn ? 'ring-1 ring-admin-warning/50' : undefined}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-admin-ink-4">{label}</p>
        {tooltip ? (
          <span title={tooltip} className="shrink-0 text-admin-ink-4">
            <CircleHelp size={16} strokeWidth={2} aria-label={tooltip} />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-admin-ink-2">{value}</p>
      {hint ? <p className="mt-1 text-xs text-admin-ink-4">{hint}</p> : null}
    </Card>
  )
}
