/**
 * POST /api/admin/pagespeed-lab-check
 *
 * Runs Google PageSpeed Insights (lab) for the marketing homepage — mobile + desktop.
 * Admin-only. Requires PAGESPEED_API_KEY on Vercel (GCP PageSpeed Insights API key).
 *
 * Node.js runtime (req/res) — not Web Request — so maxDuration can cover PSI latency.
 */
import { createClient } from '@supabase/supabase-js'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { isPlatformAdminUser } from '../lib/adminAuth.js'
import { headerString } from '../lib/nodeHandler.js'

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

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
}

function corsJson(res: VercelResponse, body: unknown, status = 200, origin = '*') {
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  return res.status(status).json(body)
}

function siteUrl(): string {
  const raw = (
    process.env.PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VITE_SITE_URL ||
    'https://quni.com.au'
  ).trim()
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
  endpoint.searchParams.set('key', apiKey)

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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const vres = res as VercelResponse
  const origin = headerString(req.headers, 'origin') || '*'

  if (req.method === 'OPTIONS') {
    vres.setHeader('Access-Control-Allow-Origin', origin)
    vres.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    vres.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    vres.setHeader('Access-Control-Max-Age', '86400')
    return vres.status(204).end()
  }

  if (req.method !== 'POST') {
    return corsJson(vres, { error: 'Method not allowed' }, 405, origin)
  }

  try {
    const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
    const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
    if (!supabaseUrl || !anonKey) {
      return corsJson(vres, { error: 'Server misconfigured' }, 500, origin)
    }

    const authHeader = headerString(req.headers, 'authorization')
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return corsJson(vres, { error: 'Missing authorization' }, 401, origin)
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey)
    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser(token)
    if (userErr || !user) {
      return corsJson(vres, { error: 'Invalid or expired session' }, 401, origin)
    }
    if (!(await isPlatformAdminUser(user))) {
      return corsJson(vres, { error: 'Admin access required' }, 403, origin)
    }

    const apiKey = (process.env.PAGESPEED_API_KEY || '').trim()
    if (!apiKey) {
      return corsJson(
        vres,
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
      return corsJson(vres, { error: mobile.error, ...payload }, 502, origin)
    }

    return corsJson(vres, payload, 200, origin)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lab check failed'
    return corsJson(vres, { error: message }, 500, origin)
  }
}
