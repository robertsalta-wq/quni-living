/**
 * Fetches frontend route performance from Sentry Discover (spans dataset).
 * Admin-only endpoint for Admin -> Apps -> Performance.
 *
 * Required secrets:
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY
 * - SENTRY_AUTH_TOKEN
 * Optional (defaults shown below):
 * - SENTRY_ORG_SLUG=quni
 * - SENTRY_PROJECT_ID=4511102942183424
 * - SENTRY_REGION_URL=https://us.sentry.io
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { isPlatformAdminUser } from '../_shared/platformStaff.ts'

type SentryDiscoverRow = Record<string, unknown>

type RoutePattern = {
  label: string
  query: string
}

type RoutePerformanceRow = {
  label: string
  query: string
  transactionCount: number
  p75Lcp: number | null
  p75Inp: number | null
  p75Cls: number | null
  lcpSampleCount: number
  inpSampleCount: number
  clsSampleCount: number
  lcpExceeded: boolean
  inpExceeded: boolean
  clsExceeded: boolean
}

const STATS_PERIOD = '7d'
const CWV_LCP_FAIL_MS = 2500
const CWV_INP_FAIL_MS = 200
const CWV_CLS_FAIL = 0.1

const ROUTE_PATTERNS: RoutePattern[] = [
  { label: '/listings', query: 'transaction:/listings' },
  {
    label: '/student-accommodation/*',
    query: 'transaction:/student-accommodation/*',
  },
  { label: '/property/*', query: 'transaction:/property/*' },
  { label: '/properties/*', query: 'transaction:/properties/*' },
]

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const extra = (Deno.env.get('TPP_DOMAINS_CORS_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const allow = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://quni.com.au',
    'https://quni-living.vercel.app',
    ...extra,
  ])
  const allowOrigin = origin && allow.has(origin) ? origin : '*'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

function asNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return 0
}

function asNullableNumber(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}

async function querySentryDiscover(args: {
  baseUrl: string
  orgSlug: string
  projectId: string
  token: string
  query: string
  fields: string[]
  statsPeriod?: string
}): Promise<SentryDiscoverRow[]> {
  const url = new URL(`/api/0/organizations/${args.orgSlug}/events/`, args.baseUrl)
  url.searchParams.set('dataset', 'spans')
  url.searchParams.set('project', args.projectId)
  url.searchParams.set('query', args.query)
  url.searchParams.set('statsPeriod', args.statsPeriod ?? STATS_PERIOD)
  url.searchParams.set('referrer', 'admin-apps-frontend-performance')
  for (const field of args.fields) {
    url.searchParams.append('field', field)
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${args.token}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sentry API ${res.status}: ${text.slice(0, 240)}`)
  }
  const payload = (await res.json()) as unknown
  if (Array.isArray(payload)) return payload as SentryDiscoverRow[]
  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: SentryDiscoverRow[] }).data
  }
  return []
}

async function buildRoutePerformanceRow(args: {
  baseUrl: string
  orgSlug: string
  projectId: string
  token: string
  pattern: RoutePattern
}): Promise<RoutePerformanceRow> {
  const baseQuery = `environment:production ${args.pattern.query}`
  const aggregateRows = await querySentryDiscover({
    baseUrl: args.baseUrl,
    orgSlug: args.orgSlug,
    projectId: args.projectId,
    token: args.token,
    query: baseQuery,
    fields: [
      'count()',
      'p75(measurements.lcp)',
      'p75(measurements.inp)',
      'p75(measurements.cls)',
    ],
  })
  const aggregate = aggregateRows[0] ?? {}

  const [lcpCountRows, inpCountRows, clsCountRows] = await Promise.all([
    querySentryDiscover({
      baseUrl: args.baseUrl,
      orgSlug: args.orgSlug,
      projectId: args.projectId,
      token: args.token,
      query: `${baseQuery} has:measurements.lcp`,
      fields: ['count()'],
    }),
    querySentryDiscover({
      baseUrl: args.baseUrl,
      orgSlug: args.orgSlug,
      projectId: args.projectId,
      token: args.token,
      query: `${baseQuery} has:measurements.inp`,
      fields: ['count()'],
    }),
    querySentryDiscover({
      baseUrl: args.baseUrl,
      orgSlug: args.orgSlug,
      projectId: args.projectId,
      token: args.token,
      query: `${baseQuery} has:measurements.cls`,
      fields: ['count()'],
    }),
  ])

  const p75Lcp = asNullableNumber(aggregate['p75(measurements.lcp)'])
  const p75Inp = asNullableNumber(aggregate['p75(measurements.inp)'])
  const p75Cls = asNullableNumber(aggregate['p75(measurements.cls)'])
  const transactionCount = asNumber(aggregate['count()'])
  const lcpSampleCount = asNumber((lcpCountRows[0] ?? {})['count()'])
  const inpSampleCount = asNumber((inpCountRows[0] ?? {})['count()'])
  const clsSampleCount = asNumber((clsCountRows[0] ?? {})['count()'])

  return {
    label: args.pattern.label,
    query: args.pattern.query,
    transactionCount,
    p75Lcp,
    p75Inp,
    p75Cls,
    lcpSampleCount,
    inpSampleCount,
    clsSampleCount,
    lcpExceeded: p75Lcp != null && p75Lcp > CWV_LCP_FAIL_MS,
    inpExceeded: p75Inp != null && p75Inp > CWV_INP_FAIL_MS,
    clsExceeded: p75Cls != null && p75Cls > CWV_CLS_FAIL,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }
  if (req.method !== 'GET') {
    return json(req, { error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey) {
    return json(req, { error: 'Server misconfigured' }, 500)
  }
  const sentryToken = Deno.env.get('SENTRY_AUTH_TOKEN')?.trim()
  if (!sentryToken) {
    return json(req, { error: 'SENTRY_AUTH_TOKEN is not configured' }, 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()
  const isAdmin = !userErr && user != null && (await isPlatformAdminUser(userClient, user))
  if (userErr || !user || !isAdmin) {
    const msg =
      userErr?.message?.includes('Invalid JWT') || userErr?.message?.includes('invalid JWT')
        ? 'Your session could not be verified. Sign out, sign in again, then retry.'
        : user && !isAdmin
          ? 'Forbidden.'
          : (userErr?.message ?? 'Please sign in again.')
    return json(req, { error: msg }, user && !isAdmin ? 403 : 401)
  }

  const sentryOrg = (Deno.env.get('SENTRY_ORG_SLUG') ?? 'quni').trim()
  const sentryProjectId = (Deno.env.get('SENTRY_PROJECT_ID') ?? '4511102942183424').trim()
  const sentryRegionUrl = (Deno.env.get('SENTRY_REGION_URL') ?? 'https://us.sentry.io').trim()

  try {
    const rows = await Promise.all(
      ROUTE_PATTERNS.map((pattern) =>
        buildRoutePerformanceRow({
          baseUrl: sentryRegionUrl,
          orgSlug: sentryOrg,
          projectId: sentryProjectId,
          token: sentryToken,
          pattern,
        }),
      ),
    )
    const failingRoutes = rows.filter((r) => r.lcpExceeded || r.inpExceeded || r.clsExceeded)
    return json(req, {
      statsPeriod: STATS_PERIOD,
      cwvThresholds: {
        lcpMs: CWV_LCP_FAIL_MS,
        inpMs: CWV_INP_FAIL_MS,
        cls: CWV_CLS_FAIL,
      },
      rows,
      failingRoutes: failingRoutes.map((r) => r.label),
      checkedAt: new Date().toISOString(),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to query Sentry'
    return json(req, { error: message }, 500)
  }
})
