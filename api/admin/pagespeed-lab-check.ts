/**
 * POST /api/admin/pagespeed-lab-check
 *
 * Runs Google PageSpeed Insights (lab) for the marketing homepage — mobile + desktop.
 * Admin-only. Requires PAGESPEED_API_KEY on Vercel (GCP PageSpeed Insights API key).
 */
import { requireAdminUser } from '../lib/adminAuth.js'

export const config = { runtime: 'nodejs', maxDuration: 120 }

type Strategy = 'mobile' | 'desktop'

type LabStrategyResult = {
  strategy: Strategy
  performance: number | null
  fcp: string | null
  lcp: string | null
  tbt: string | null
  cls: string | null
  speedIndex: string | null
  lcpElement: string | null
  error: string | null
}

export type PagespeedLabCheckResponse = {
  url: string
  checkedAt: string
  mobile: LabStrategyResult
  desktop: LabStrategyResult
  apiKeyConfigured: boolean
}

function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  })
}

function siteUrl(): string {
  const raw =
    (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://quni.com.au').trim()
  return raw.replace(/\/+$/, '') || 'https://quni.com.au'
}

function pickLcpElement(audits: Record<string, unknown> | undefined): string | null {
  const block = audits?.['largest-contentful-paint-element'] as
    | { details?: { items?: Array<{ items?: Array<{ node?: { snippet?: string; selector?: string } }> }> } }
    | undefined
  const node = block?.details?.items?.[0]?.items?.[0]?.node
  const snippet = typeof node?.snippet === 'string' ? node.snippet.trim() : ''
  if (snippet) return snippet.length > 220 ? `${snippet.slice(0, 217)}…` : snippet
  const selector = typeof node?.selector === 'string' ? node.selector.trim() : ''
  return selector || null
}

function auditDisplay(audits: Record<string, unknown> | undefined, id: string): string | null {
  const a = audits?.[id] as { displayValue?: string } | undefined
  return typeof a?.displayValue === 'string' ? a.displayValue : null
}

async function runStrategy(
  pageUrl: string,
  strategy: Strategy,
  apiKey: string,
): Promise<LabStrategyResult> {
  const empty: LabStrategyResult = {
    strategy,
    performance: null,
    fcp: null,
    lcp: null,
    tbt: null,
    cls: null,
    speedIndex: null,
    lcpElement: null,
    error: null,
  }
  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed')
  endpoint.searchParams.set('url', pageUrl)
  endpoint.searchParams.set('strategy', strategy)
  endpoint.searchParams.append('category', 'performance')
  if (apiKey) endpoint.searchParams.set('key', apiKey)

  try {
    const res = await fetch(endpoint.toString(), { method: 'GET' })
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; code?: number }
      lighthouseResult?: {
        categories?: { performance?: { score?: number | null } }
        audits?: Record<string, unknown>
      }
    }
    if (!res.ok) {
      return {
        ...empty,
        error: body.error?.message || `PageSpeed API ${res.status}`,
      }
    }
    const score = body.lighthouseResult?.categories?.performance?.score
    const audits = body.lighthouseResult?.audits
    return {
      strategy,
      performance: typeof score === 'number' ? Math.round(score * 100) : null,
      fcp: auditDisplay(audits, 'first-contentful-paint'),
      lcp: auditDisplay(audits, 'largest-contentful-paint'),
      tbt: auditDisplay(audits, 'total-blocking-time'),
      cls: auditDisplay(audits, 'cumulative-layout-shift'),
      speedIndex: auditDisplay(audits, 'speed-index'),
      lcpElement: pickLcpElement(audits),
      error: null,
    }
  } catch (err) {
    return {
      ...empty,
      error: err instanceof Error ? err.message : 'PageSpeed request failed',
    }
  }
}

export default async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin)
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
  if (!supabaseUrl || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500, origin)
  }

  const auth = await requireAdminUser(request, supabaseUrl, anonKey)
  if ('error' in auth) {
    return json({ error: auth.error }, auth.status, origin)
  }

  const apiKey = (process.env.PAGESPEED_API_KEY || '').trim()
  if (!apiKey) {
    return json(
      {
        error:
          'PAGESPEED_API_KEY is not set on Vercel. Create a Google Cloud API key with PageSpeed Insights API enabled, then add it as PAGESPEED_API_KEY.',
      },
      503,
      origin,
    )
  }

  const pageUrl = `${siteUrl()}/`
  const [mobile, desktop] = await Promise.all([
    runStrategy(pageUrl, 'mobile', apiKey),
    runStrategy(pageUrl, 'desktop', apiKey),
  ])

  const payload: PagespeedLabCheckResponse = {
    url: pageUrl,
    checkedAt: new Date().toISOString(),
    mobile,
    desktop,
    apiKeyConfigured: true,
  }

  if (mobile.error && desktop.error) {
    return json({ error: mobile.error, ...payload }, 502, origin)
  }

  return json(payload, 200, origin)
}
