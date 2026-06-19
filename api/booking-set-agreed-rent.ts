// @ts-nocheck
import { createClient } from '@supabase/supabase-js'
import { headerString, readJsonBody } from './lib/nodeHandler.js'
import {
  buildRentAgreedOverridePatch,
  insertRentAgreedOverrideEvent,
  parseWeeklyRentAud,
} from './lib/booking/rentAgreedOverride.js'

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

  let body
  try {
    body = await readJsonBody(req)
  } catch {
    return corsJson(res, { error: 'Invalid JSON' }, 400, origin)
  }

  const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  const agreedWeeklyRentAud = parseWeeklyRentAud(body.agreedWeeklyRent ?? body.weeklyRent)

  if (!bookingId) {
    return corsJson(res, { error: 'bookingId is required' }, 400, origin)
  }
  if (agreedWeeklyRentAud == null) {
    return corsJson(res, { error: 'agreedWeeklyRent must be a positive number' }, 400, origin)
  }
  if (reason.length < 3) {
    return corsJson(res, { error: 'reason is required (at least 3 characters)' }, 400, origin)
  }
  if (reason.length > 2000) {
    return corsJson(res, { error: 'reason is too long' }, 400, origin)
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

    if (user.user_metadata?.role !== 'landlord') {
      return corsJson(res, { error: 'Only landlords can set agreed rent' }, 403, origin)
    }

    const admin = createClient(supabaseUrl, serviceRole)

    const { data: landlord, error: llErr } = await admin
      .from('landlord_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (llErr || !landlord) {
      return corsJson(res, { error: 'Landlord profile not found' }, 404, origin)
    }

    const { data: booking, error: bErr } = await admin
      .from('bookings')
      .select(
        `
        id,
        property_id,
        student_id,
        landlord_id,
        status,
        weekly_rent,
        rent_breakdown,
        bond_amount,
        service_tier_at_request,
        stripe_payment_intent_id,
        move_in_date,
        start_date,
        properties (
          id,
          bond,
          state,
          property_type,
          is_registered_rooming_house
        )
      `,
      )
      .eq('id', bookingId)
      .maybeSingle()

    if (bErr || !booking) {
      return corsJson(res, { error: 'Booking not found' }, 404, origin)
    }

    if (booking.landlord_id !== landlord.id) {
      return corsJson(res, { error: 'Forbidden' }, 403, origin)
    }

    const property =
      booking.properties && typeof booking.properties === 'object' && !Array.isArray(booking.properties)
        ? booking.properties
        : {}

    const built = await buildRentAgreedOverridePatch(
      booking,
      property,
      agreedWeeklyRentAud,
      reason,
      landlord.id,
    )

    if (!built.ok) {
      return corsJson(
        res,
        { error: built.error, message: built.message },
        built.status,
        origin,
      )
    }

    const { data: updated, error: upErr } = await admin
      .from('bookings')
      .update(built.patch)
      .eq('id', bookingId)
      .in('status', ['pending_confirmation', 'awaiting_info'])
      .select('id, weekly_rent, bond_amount, rent_breakdown')
      .maybeSingle()

    if (upErr) {
      console.error('[booking-set-agreed-rent] update', upErr)
      return corsJson(res, { error: 'Could not update booking' }, 500, origin)
    }

    if (!updated) {
      return corsJson(
        res,
        { error: 'concurrent_update', message: 'Booking status changed; refresh and try again.' },
        409,
        origin,
      )
    }

    try {
      await insertRentAgreedOverrideEvent(admin, {
        booking,
        property,
        landlordProfileId: landlord.id,
        studentId: booking.student_id,
        metadata: built.eventMetadata,
      })
    } catch (evErr) {
      console.error('[booking-set-agreed-rent] audit event', evErr)
      const { error: revertErr } = await admin
        .from('bookings')
        .update({
          weekly_rent: booking.weekly_rent,
          rent_breakdown: booking.rent_breakdown,
          bond_amount: booking.bond_amount,
        })
        .eq('id', bookingId)
      if (revertErr) {
        console.error('[booking-set-agreed-rent] revert after audit failure', revertErr)
      }
      return corsJson(
        res,
        { error: 'audit_failed', message: 'Rent was not saved because the compliance audit record failed.' },
        500,
        origin,
      )
    }

    return corsJson(
      res,
      {
        ok: true,
        booking: updated,
        applyWeeklyRentAud: built.eventMetadata.apply_weekly_rent_aud,
      },
      200,
      origin,
    )
  } catch (e) {
    console.error('[booking-set-agreed-rent]', e)
    return corsJson(res, { error: 'Server error' }, 500, origin)
  }
}
