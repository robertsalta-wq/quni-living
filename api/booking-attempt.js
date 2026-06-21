/**
 * POST JSON: { attempt_id, property_id }
 * Authorization: Bearer <Supabase access_token>
 *
 * Records booking_page_opened for walk-away visibility (early booking funnel has no other Vercel call).
 */
import { createClient } from '@supabase/supabase-js'
import { insertJourneyEvent, readAttemptIdFromBody } from './lib/journey/insertJourneyEvent.js'

export const config = { runtime: 'edge' }

function json(body, status = 200, origin) {
  const allowOrigin = origin || '*'
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin)
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500, origin)
  }

  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return json({ error: 'Missing authorization' }, 401, origin)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400, origin)
  }

  const attemptId = readAttemptIdFromBody(body)
  const propertyId =
    typeof body.property_id === 'string'
      ? body.property_id.trim()
      : typeof body.propertyId === 'string'
        ? body.propertyId.trim()
        : ''

  if (!attemptId) {
    return json({ error: 'attempt_id is required' }, 400, origin)
  }
  if (!propertyId) {
    return json({ error: 'property_id is required' }, 400, origin)
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey)
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser(token)

  if (userErr || !user) {
    return json({ error: 'Invalid or expired session' }, 401, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)

  void insertJourneyEvent(
    {
      user_id: user.id,
      email: user.email ?? null,
      attempt_id: attemptId,
      property_id: propertyId,
      event_type: 'booking_page_opened',
      step: 'booking_page',
      metadata: {},
    },
    admin,
  )

  return json({ ok: true }, 200, origin)
}
