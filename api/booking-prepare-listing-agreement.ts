// @ts-nocheck - Landlord retry: generate listing tenancy PDF + DocuSeal when accept-time generation failed.
import { createClient } from '@supabase/supabase-js'
import { headerString, readJsonBody } from './lib/nodeHandler.js'
import { bookingAllowsTenancyDocumentGeneration } from './lib/booking/listingDocumentGenerationEligibility.js'
import { triggerListingDocumentGeneration } from './lib/booking/triggerListingDocumentGeneration.js'

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

    if (user.user_metadata?.role !== 'landlord') {
      return corsJson(res, { error: 'Only landlords can prepare the tenancy agreement' }, 403, origin)
    }

    const admin = createClient(supabaseUrl, serviceRole)

    const { data: landlord, error: llErr } = await admin
      .from('landlord_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (llErr || !landlord) {
      return corsJson(res, { error: 'Landlord profile not found' }, 403, origin)
    }

    const { data: booking, error: bErr } = await admin
      .from('bookings')
      .select('id, landlord_id, status, service_tier_final')
      .eq('id', bookingId)
      .maybeSingle()

    if (bErr || !booking) {
      return corsJson(res, { error: 'Booking not found' }, 404, origin)
    }

    if (booking.landlord_id !== landlord.id) {
      return corsJson(res, { error: 'Forbidden' }, 403, origin)
    }

    if (booking.service_tier_final !== 'listing') {
      return corsJson(res, { error: 'This action applies only to Listing bookings' }, 400, origin)
    }

    if (!bookingAllowsTenancyDocumentGeneration(booking)) {
      return corsJson(res, { error: 'Agreement cannot be prepared for this booking status' }, 409, origin)
    }

    const gen = await triggerListingDocumentGeneration({
      admin,
      bookingId,
      deferSigning: false,
    })

    if (!gen.ok) {
      return corsJson(
        res,
        { error: 'Could not prepare tenancy agreement', detail: gen.detail ?? gen.error },
        gen.status >= 400 && gen.status < 600 ? gen.status : 500,
        origin,
      )
    }

    if (gen.skipped) {
      return corsJson(
        res,
        { error: 'Could not prepare tenancy agreement', detail: gen.reason ?? 'skipped' },
        409,
        origin,
      )
    }

    const { setListingAgreementStatus } = await import('./lib/booking/listingAgreementStatus.js')
    await setListingAgreementStatus(admin, bookingId, 'ready', null)

    return corsJson(res, { ok: true }, 200, origin)
  } catch (e) {
    console.error('[booking-prepare-listing-agreement]', e)
    return corsJson(res, { error: 'Server error' }, 500, origin)
  }
}
