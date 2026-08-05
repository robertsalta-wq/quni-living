// @ts-nocheck - Landlord initiates Listing mutual-surrender terminate.
import { createClient } from '@supabase/supabase-js'
import { headerString, readJsonBody } from './lib/nodeHandler.js'
import { runInitiateMutualSurrender } from './lib/booking/termination/initiateMutualSurrender.js'
import { isBondOutcome } from './lib/booking/termination/types.js'

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

  let body
  try {
    body = await readJsonBody(req)
  } catch {
    return corsJson(res, { error: 'Invalid JSON' }, 400, origin)
  }

  const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
  const terminationEffectiveDate =
    typeof body.terminationEffectiveDate === 'string' ? body.terminationEffectiveDate.trim() : ''
  const reasonNote = typeof body.reasonNote === 'string' ? body.reasonNote : null
  const bondOutcome = isBondOutcome(body.bondOutcome) ? body.bondOutcome : 'pending'
  const bondOutcomeNote = typeof body.bondOutcomeNote === 'string' ? body.bondOutcomeNote : null
  const newPremisesLine = typeof body.newPremisesLine === 'string' ? body.newPremisesLine : null
  const continueInSamePremises = body.continueInSamePremises !== false

  const reasonTrimmed = typeof reasonNote === 'string' ? reasonNote.trim() : ''

  if (!bookingId || !terminationEffectiveDate) {
    return corsJson(
      res,
      { error: 'bookingId and terminationEffectiveDate are required' },
      400,
      origin,
    )
  }
  if (reasonTrimmed.length < 3) {
    return corsJson(
      res,
      { error: 'reasonNote is required (why this agreement is ending)' },
      400,
      origin,
    )
  }

  const auth = headerString(req.headers, 'authorization')
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return corsJson(res, { error: 'Missing authorization' }, 401, origin)
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
      return corsJson(res, { error: 'Only landlords can initiate mutual surrender' }, 403, origin)
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

    const result = await runInitiateMutualSurrender({
      admin,
      landlordProfileId: landlord.id,
      bookingId,
      terminationEffectiveDate,
      reasonNote: reasonTrimmed,
      bondOutcome,
      bondOutcomeNote,
      newPremisesLine,
      continueInSamePremises,
      initiatedBy: 'landlord',
    })

    if (!result.ok) {
      return corsJson(res, { error: result.message, code: result.code }, result.status, origin)
    }

    return corsJson(
      res,
      {
        ok: true,
        bookingId: result.bookingId,
        status: result.status,
        documentId: result.documentId,
        submissionId: result.submissionId,
        landlordSigningUrl: result.landlordSigningUrl,
        idempotent: result.idempotent,
      },
      200,
      origin,
    )
  } catch (e) {
    console.error('booking-terminate-mutual-surrender', e)
    return corsJson(res, { error: 'Unexpected error' }, 500, origin)
  }
}
