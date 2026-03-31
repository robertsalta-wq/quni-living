/**
 * Safe Xero connection summary for admin UI (no tokens exposed).
 * GET — Authorization: Bearer <Supabase access_token> (platform admin)
 */
import { createClient } from '@supabase/supabase-js'
import { requireAdminUser } from './lib/adminAuth.js'

export const config = { runtime: 'edge' }

function json(body, status = 200, origin) {
  const allowOrigin = origin || '*'
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  })
}

export default async function handler(request) {
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, origin)
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500, origin)
  }

  const authResult = await requireAdminUser(request, supabaseUrl, anonKey)
  if ('error' in authResult) {
    return json({ error: authResult.error }, authResult.status, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const { data: rows } = await admin
    .from('xero_settings')
    .select('tenant_id, connected_at, last_sync_at')
    .order('connected_at', { ascending: false })
    .limit(1)

  const row = rows?.[0]
  const connected = Boolean(row?.tenant_id?.trim())

  return json(
    {
      connected,
      lastSyncAt: row?.last_sync_at ?? null,
      connectedAt: row?.connected_at ?? null,
    },
    200,
    origin,
  )
}
