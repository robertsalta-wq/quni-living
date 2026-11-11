// @ts-nocheck - Page-load pickup for listing agreement work that did not finish after accept.
import { createClient } from '@supabase/supabase-js'
import { headerString, readJsonBody, requestContextFromNodeRequest } from './lib/nodeHandler.js'
import { runFinishListingAcceptance } from './lib/booking/finishListingAcceptance.js'

export const config = { runtime: 'nodejs', maxDuration: 60 }

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

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return corsJson(res, { error: 'Server misconfigured' }, 500, origin)
  }

  const auth = headerString(req.headers, 'authorization')
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return corsJson(res, { error: 'Missing authorization' }, 401, origin)
  }

  let body: Record<string, unknown>
  try {
    body = (await readJsonBody(req)) as Record<string, unknown>
  } catch {
    return corsJson(res, { error: 'Invalid JSON' }, 400, origin)
  }

  const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
  if (!bookingId) {
    return corsJson(res, { error: 'bookingId is required' }, 400, origin)
  }

  try {
    const supabaseAuth = createClient(supabaseUrl, anonKey)
    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser(token)

    if (userErr || !user) {
      return corsJson(res, { error: 'Invalid or expired session' }, 401, origin)
    }

    const admin = createClient(supabaseUrl, serviceRole)

    const { data: booking, error: bErr } = await admin
      .from('bookings')
      .select('id, landlord_id, student_id, status, service_tier_final')
      .eq('id', bookingId)
      .maybeSingle()

    if (bErr || !booking) {
      return corsJson(res, { error: 'Booking not found' }, 404, origin)
    }

    const { data: landlord } = await admin
      .from('landlord_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    const { data: student } = await admin
      .from('student_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    const isLandlord = Boolean(landlord?.id) && booking.landlord_id === landlord.id
    const isStudent = Boolean(student?.id) && booking.student_id === student.id
    if (!isLandlord && !isStudent) {
      return corsJson(res, { error: 'Forbidden' }, 403, origin)
    }

    if (booking.service_tier_final && booking.service_tier_final !== 'listing') {
      return corsJson(res, { error: 'This action applies only to Listing bookings' }, 409, origin)
    }

    if (booking.status !== 'bond_pending' && booking.status !== 'confirmed' && booking.status !== 'active') {
      return corsJson(res, { error: 'Agreement cannot be finished for this booking status' }, 409, origin)
    }

    const finished = await runFinishListingAcceptance(admin, {
      bookingId,
      deviceCtx: requestContextFromNodeRequest(req),
    })

    if (finished.outcome === 'failed') {
      return corsJson(res, { ok: false, error: 'Could not finish the agreement' }, 500, origin)
    }

    return corsJson(
      res,
      { ok: true, outcome: finished.outcome, pending: finished.outcome === 'busy' },
      200,
      origin,
    )
  } catch (e) {
    console.error('[booking-finish-listing-acceptance]', e)
    return corsJson(res, { error: 'Server error' }, 500, origin)
  }
}
