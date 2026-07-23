/// <reference types="node" />
/**
 * Trigger a production Vercel redeploy so listing prerender HTML stays fresh.
 *
 * Auth: Supabase session of a landlord or platform admin (Bearer token).
 * Env: VERCEL_DEPLOY_HOOK_URL (optional — no-ops with 204 when unset),
 *      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY | VITE_SUPABASE_ANON_KEY
 */
import { createClient } from '@supabase/supabase-js'
import { isPlatformAdminUser } from '../lib/adminAuth.js'
import { headerString } from '../lib/nodeHandler.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 15,
}

const DEBOUNCE_MS = 30_000
let lastDeployAt = 0

type Res = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => { json: (body: unknown) => void; end: () => void }
  end: () => void
}

function corsJson(res: Res, body: unknown, status = 200, origin = '*') {
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  return res.status(status).json(body)
}

export default async function handler(
  req: { method?: string; headers?: import('node:http').IncomingMessage['headers'] },
  res: Res,
) {
  const origin = headerString(req.headers ?? {}, 'origin') || '*'

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.setHeader('Access-Control-Max-Age', '86400')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return corsJson(res, { error: 'Method not allowed' }, 405, origin)
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return corsJson(res, { error: 'Server configuration error' }, 500, origin)
  }

  const auth = headerString(req.headers ?? {}, 'authorization')
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return corsJson(res, { error: 'Authorization Bearer token required' }, 401, origin)
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey)
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser(token)

  if (userErr || !user) {
    return corsJson(res, { error: 'Invalid or expired session' }, 401, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const { data: lpRow, error: lpErr } = await admin
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const isLandlord = !lpErr && Boolean(lpRow)
  if (!isLandlord && !(await isPlatformAdminUser(user))) {
    return corsJson(res, { error: 'Landlord or admin session required' }, 403, origin)
  }

  const hookUrl = (process.env.VERCEL_DEPLOY_HOOK_URL || '').trim()
  if (!hookUrl) {
    console.info('[trigger-rebuild] VERCEL_DEPLOY_HOOK_URL unset — no-op')
    res.setHeader('Access-Control-Allow-Origin', origin)
    return res.status(204).end()
  }

  const now = Date.now()
  if (now - lastDeployAt < DEBOUNCE_MS) {
    return corsJson(
      res,
      { ok: true, queued: false, reason: 'debounced', retryAfterMs: DEBOUNCE_MS - (now - lastDeployAt) },
      202,
      origin,
    )
  }

  try {
    const hookRes = await fetch(hookUrl, { method: 'POST' })
    if (!hookRes.ok) {
      const text = await hookRes.text().catch(() => '')
      console.error('[trigger-rebuild] deploy hook failed', hookRes.status, text.slice(0, 200))
      return corsJson(res, { error: 'Deploy hook request failed' }, 502, origin)
    }
    lastDeployAt = now
    return corsJson(res, { ok: true, queued: true }, 202, origin)
  } catch (e) {
    console.error('[trigger-rebuild] deploy hook error', e)
    return corsJson(res, { error: 'Deploy hook request failed' }, 502, origin)
  }
}
