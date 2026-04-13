import { createClient } from '@supabase/supabase-js'

import { fetchPlatformConfigValueMap } from '../lib/platformConfig.js'
import type { Database } from '../../src/lib/database.types.js'

export const config = {
  runtime: 'edge',
}

const CONFIG_KEY = 'house_rules.default'

function json(body: unknown, status = 200, origin: string) {
  const allowOrigin = origin || '*'
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'public, max-age=0, s-maxage=0',
    },
  })
}

function getBearerToken(headerValue: string | null): string | null {
  if (!headerValue) return null
  const m = headerValue.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() || null
}

export default async function handler(request: Request) {
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

  try {
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, origin)
    }

    const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
    const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
    const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
    if (!supabaseUrl || !serviceRole || !anonKey) {
      const detail = {
        supabaseUrl: Boolean(supabaseUrl),
        serviceRole: Boolean(serviceRole),
        anonKey: Boolean(anonKey),
      }
      console.error('[api/platform/house-rules-default] missing env vars', detail)
      return json({ error: 'Server is missing required Supabase env vars.', detail }, 500, origin)
    }

    const token = getBearerToken(request.headers.get('authorization'))
    if (!token) {
      console.error('[api/platform/house-rules-default] missing bearer token')
      return json({ error: 'Unauthorized', detail: 'Missing Authorization Bearer token.' }, 401, origin)
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey)
    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser(token)
    if (userErr || !user) {
      const detail = userErr?.message || 'Invalid or expired token.'
      console.error('[api/platform/house-rules-default] token validation failed', { detail })
      return json({ error: 'Unauthorized', detail }, 401, origin)
    }

    const admin = createClient<Database>(supabaseUrl, serviceRole)
    const map = await fetchPlatformConfigValueMap(admin, [CONFIG_KEY])
    const value = map[CONFIG_KEY] ?? ''

    return json({ default: value }, 200, origin)
  } catch (e) {
    console.error('[api/platform/house-rules-default] unhandled', e)
    return json(
      { error: 'Internal server error', detail: e instanceof Error ? e.message : String(e) },
      500,
      origin,
    )
  }
}
