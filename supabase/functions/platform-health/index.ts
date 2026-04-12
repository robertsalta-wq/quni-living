/**
 * Runs health checks, upserts operational_status, returns HealthResult[].
 * Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, + checks (TPP_*, STRIPE_SECRET_KEY, RESEND_API_KEY).
 * Deploy: supabase functions deploy platform-health --no-verify-jwt
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { isAdminUser } from '../_shared/adminEmails.ts'
import { checkAllServices, type HealthResult } from '../_shared/healthChecks.ts'

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const extra = (Deno.env.get('TPP_DOMAINS_CORS_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const allow = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }
  if (req.method !== 'GET') {
    return json(req, { error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRole) {
    return json(req, { error: 'Server misconfigured' }, 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()

  if (userErr || !user || !isAdminUser(user)) {
    const msg =
      userErr?.message?.includes('Invalid JWT') || userErr?.message?.includes('invalid JWT')
        ? 'Your session could not be verified. Sign out, sign in again, then retry.'
        : user && !isAdminUser(user)
          ? 'Forbidden.'
          : (userErr?.message ?? 'Please sign in again.')
    return json(req, { error: msg }, user && !isAdminUser(user) ? 403 : 401)
  }

  let results: HealthResult[]
  try {
    results = await checkAllServices({})
  } catch (e) {
    console.error('platform-health checkAllServices', e)
    const message = e instanceof Error ? e.message : 'Health checks failed'
    return json(req, { error: message }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const checkedAt = new Date().toISOString()
  for (const r of results) {
    const { error: upErr } = await admin.from('operational_status').upsert(
      {
        service_name: r.service,
        status: r.status,
        message: r.message,
        checked_at: checkedAt,
      },
      { onConflict: 'service_name' },
    )
    if (upErr) {
      console.error('operational_status upsert', r.service, upErr)
      return json(req, { error: upErr.message ?? 'Could not save operational status' }, 500)
    }
  }

  return json(req, results)
})
