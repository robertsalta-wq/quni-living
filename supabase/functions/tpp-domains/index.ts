/**
 * TPP Wholesale domain list + details for Quni admin dashboard.
 * Secrets: TPP_API_USER, TPP_API_PASSWORD, TPP_ACCOUNT_NUM
 * Deploy: supabase functions deploy tpp-domains --no-verify-jwt
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { isAdminUser } from '../_shared/adminEmails.ts'
import { fetchTppDomainsWithDetails, loadTppEnvFromDeno, TppApiError } from '../_shared/tppWholesale.ts'

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
  if (!supabaseUrl || !anonKey) {
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

  const tppEnv = loadTppEnvFromDeno()
  if (!tppEnv) {
    console.error('Missing TPP_API_USER, TPP_API_PASSWORD, or TPP_ACCOUNT_NUM')
    return json(req, {
      error:
        'TPP API is not configured. Set secrets TPP_API_USER (UserId), TPP_API_PASSWORD, and TPP_ACCOUNT_NUM (AccountNo from API credentials).',
    }, 500)
  }

  try {
    const domains = await fetchTppDomainsWithDetails(tppEnv)
    return json(req, { domains })
  } catch (e) {
    if (e instanceof TppApiError) {
      return json(
        req,
        {
          error: `${e.code}: ${e.detail || e.message}`.trim(),
          tppCode: e.code,
          tppMessage: e.detail,
          tppRaw: e.rawBody.slice(0, 4000),
        },
        502,
      )
    }
    console.error('tpp-domains', e)
    const message = e instanceof Error ? e.message : 'Could not load domains.'
    return json(req, { error: message }, 500)
  }
})
