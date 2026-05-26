/**
 * Admin CRUD for internal fee-exempt landlord emails (fee_exempt_accounts).
 * GET: list. POST: add { email, notes? }. DELETE: ?email=...
 */
import { createClient } from '@supabase/supabase-js'

import { requireAdminUser } from '../lib/adminAuth.js'

export const config = { runtime: 'edge' }

type FeeExemptRow = {
  id: string
  email: string
  notes: string | null
  created_at: string
  created_by: string | null
}

function json(body: unknown, status = 200, origin: string) {
  const allowOrigin = origin || '*'
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'no-store',
    },
  })
}

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  if (!email || !email.includes('@')) return null
  return email
}

export default async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500, origin)
  }

  const authResult = await requireAdminUser(request, supabaseUrl, anonKey)
  if ('error' in authResult) {
    return json({ error: authResult.error }, authResult.status, origin)
  }
  const { user } = authResult

  const admin = createClient(supabaseUrl, serviceRole)

  try {
    if (request.method === 'GET') {
      const { data, error } = await admin
        .from('fee_exempt_accounts')
        .select('id, email, notes, created_at, created_by')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[api/admin/fee-exempt] GET', error.message)
        return json({ error: error.message }, 500, origin)
      }
      return json({ accounts: (data ?? []) as FeeExemptRow[] }, 200, origin)
    }

    if (request.method === 'POST') {
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return json({ error: 'Invalid JSON' }, 400, origin)
      }
      if (!body || typeof body !== 'object') {
        return json({ error: 'Invalid body' }, 400, origin)
      }
      const b = body as Record<string, unknown>
      const email = normalizeEmail(b.email)
      if (!email) {
        return json({ error: 'A valid email is required' }, 400, origin)
      }
      const notes =
        typeof b.notes === 'string' && b.notes.trim() ? b.notes.trim().slice(0, 500) : null

      const { data, error } = await admin
        .from('fee_exempt_accounts')
        .insert({ email, notes, created_by: user.id })
        .select('id, email, notes, created_at, created_by')
        .single()

      if (error) {
        if (error.code === '23505') {
          return json({ error: 'That email is already on the fee-exempt list' }, 409, origin)
        }
        console.error('[api/admin/fee-exempt] POST', error.message)
        return json({ error: error.message }, 500, origin)
      }
      return json({ account: data as FeeExemptRow }, 201, origin)
    }

    if (request.method === 'DELETE') {
      const url = new URL(request.url)
      const email = normalizeEmail(url.searchParams.get('email'))
      if (!email) {
        return json({ error: 'email query parameter is required' }, 400, origin)
      }

      const { data, error } = await admin
        .from('fee_exempt_accounts')
        .delete()
        .eq('email', email)
        .select('id')
        .maybeSingle()

      if (error) {
        console.error('[api/admin/fee-exempt] DELETE', error.message)
        return json({ error: error.message }, 500, origin)
      }
      if (!data) {
        return json({ error: 'Email not found on fee-exempt list' }, 404, origin)
      }
      return json({ ok: true }, 200, origin)
    }

    return json({ error: 'Method not allowed' }, 405, origin)
  } catch (e) {
    console.error('[api/admin/fee-exempt]', e)
    return json({ error: 'Unexpected server error' }, 500, origin)
  }
}
