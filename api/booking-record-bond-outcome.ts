// @ts-nocheck - Record external bond outcome on terminate (no money movement).
import { createClient } from '@supabase/supabase-js'
import { headerString, readJsonBody } from './lib/nodeHandler.js'
import { isBondOutcome } from './lib/booking/termination/types.js'

export const config = { runtime: 'nodejs', maxDuration: 30 }

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

  let body
  try {
    body = await readJsonBody(req)
  } catch {
    return corsJson(res, { error: 'Invalid JSON' }, 400, origin)
  }

  const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
  if (!bookingId || !isBondOutcome(body.bondOutcome)) {
    return corsJson(res, { error: 'bookingId and valid bondOutcome required' }, 400, origin)
  }
  const bondOutcomeNote =
    typeof body.bondOutcomeNote === 'string' ? body.bondOutcomeNote.trim().slice(0, 2000) : null

  const auth = headerString(req.headers, 'authorization')
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) return corsJson(res, { error: 'Missing authorization' }, 401, origin)

  try {
    const supabaseAuth = createClient(supabaseUrl, anonKey)
    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser(token)
    if (userErr || !user) return corsJson(res, { error: 'Invalid session' }, 401, origin)

    const admin = createClient(supabaseUrl, serviceRole)
    const { data: landlord } = await admin
      .from('landlord_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!landlord) return corsJson(res, { error: 'Landlord profile not found' }, 404, origin)

    const { data: booking } = await admin
      .from('bookings')
      .select('id, landlord_id, student_id, status')
      .eq('id', bookingId)
      .maybeSingle()
    if (!booking || booking.landlord_id !== landlord.id) {
      return corsJson(res, { error: 'Forbidden' }, 403, origin)
    }
    if (booking.status !== 'terminating' && booking.status !== 'terminated') {
      return corsJson(
        res,
        { error: 'Bond outcome can only be recorded on terminating/terminated bookings', code: 'invalid_status' },
        400,
        origin,
      )
    }

    const { error: upErr } = await admin
      .from('bookings')
      .update({
        bond_outcome: body.bondOutcome,
        bond_outcome_note: bondOutcomeNote,
      })
      .eq('id', bookingId)

    if (upErr) {
      console.error('[bond-outcome]', upErr)
      return corsJson(res, { error: 'Could not save bond outcome' }, 500, origin)
    }

    try {
      const { recordBookingEvent } = await import('./lib/booking/events/recordBookingEvent.js')
      await recordBookingEvent(admin, {
        bookingId,
        landlordId: booking.landlord_id,
        studentId: booking.student_id,
        eventType: 'booking.field_changed',
        actorType: 'landlord',
        metadata: {
          field: 'bond_outcome',
          bond_outcome: body.bondOutcome,
          bond_outcome_note: bondOutcomeNote,
        },
      })
    } catch (evErr) {
      console.error('[bond-outcome] event', evErr)
    }

    return corsJson(res, { ok: true, bookingId, bondOutcome: body.bondOutcome }, 200, origin)
  } catch (e) {
    console.error('booking-record-bond-outcome', e)
    return corsJson(res, { error: 'Unexpected error' }, 500, origin)
  }
}
