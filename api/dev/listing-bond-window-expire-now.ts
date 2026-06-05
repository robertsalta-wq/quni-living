// @ts-nocheck - smoke-test helper: force Listing bond_pending window past due so cron picks it up on next run.
// Requires platform admin JWT + ENABLE_DEV_LISTING_BOND_SHORTCUT=true on the deployment.
import { createClient } from '@supabase/supabase-js'
import { headerString, readJsonBody } from '../lib/nodeHandler.js'
import { isPlatformAdminUser } from '../lib/adminAuth.js'

export const config = { runtime: 'nodejs', maxDuration: 15 }

function corsJson(res, body, status = 200, origin) {
  const allowOrigin = origin || '*'
  res.setHeader('Access-Control-Allow-Origin', allowOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  return res.status(status).json(body)
}

export default async function handler(req, res) {
  const origin = headerString(req.headers, 'origin') || '*'

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

  if ((process.env.ENABLE_DEV_LISTING_BOND_SHORTCUT ?? '').trim() !== 'true') {
    return corsJson(res, { error: 'Disabled (set ENABLE_DEV_LISTING_BOND_SHORTCUT=true to enable)' }, 403, origin)
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return corsJson(res, { error: 'Server misconfigured' }, 500, origin)
  }

  let body
  try {
    body = await readJsonBody(req)
  } catch {
    return corsJson(res, { error: 'Invalid JSON' }, 400, origin)
  }

  const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
  if (!bookingId) {
    return corsJson(res, { error: 'bookingId is required' }, 400, origin)
  }

  const auth = headerString(req.headers, 'authorization')
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return corsJson(res, { error: 'Missing authorization' }, 401, origin)
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey)
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser(token)

  if (userErr || !user) {
    return corsJson(res, { error: 'Invalid or expired session' }, 401, origin)
  }
  if (!(await isPlatformAdminUser(user))) {
    return corsJson(res, { error: 'Admin access required' }, 403, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const expiredIso = new Date(Date.now() - 120_000).toISOString()

  const { data: row, error: upErr } = await admin
    .from('bookings')
    .update({ bond_window_expires_at: expiredIso })
    .eq('id', bookingId)
    .eq('status', 'bond_pending')
    .eq('service_tier_final', 'listing')
    .select('id, status, bond_window_expires_at')
    .maybeSingle()

  if (upErr) {
    console.error('[dev/listing-bond-window-expire-now]', upErr)
    return corsJson(res, { error: 'Could not update booking' }, 500, origin)
  }

  if (!row) {
    return corsJson(
      res,
      {
        error:
          'No matching Listing bond_pending booking (check booking id, status bond_pending, service_tier_final listing)',
      },
      404,
      origin,
    )
  }

  return corsJson(
    res,
    {
      ok: true,
      booking_id: row.id,
      bond_window_expires_at: row.bond_window_expires_at,
      hint: 'Run GET /api/cron/expire-bookings or wait for the hourly cron to process expiry.',
    },
    200,
    origin,
  )
}
