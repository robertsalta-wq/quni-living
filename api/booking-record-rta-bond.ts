// @ts-nocheck - Vercel Node handler
import { createClient } from '@supabase/supabase-js'
import { headerString, readJsonBody } from './lib/nodeHandler.js'
import { runRecordRtaBondLodgement } from './lib/booking/recordRtaBondLodgement.js'

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

    const role = user.user_metadata?.role
    const admin = createClient(supabaseUrl, serviceRole)

    if (role === 'landlord') {
      const { data: landlord, error: llErr } = await admin
        .from('landlord_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (llErr || !landlord) {
        return corsJson(res, { error: 'Landlord profile not found' }, 404, origin)
      }

      const result = await runRecordRtaBondLodgement({
        admin,
        landlordProfileId: landlord.id,
        bookingId,
        rtaBondNumber: body.rtaBondNumber,
        rtaAcknowledgementReference: body.rtaAcknowledgementReference,
        rtaBondLodgedAt: body.rtaBondLodgedAt,
        actorRole: 'landlord',
      })

      if (!result.ok) {
        return corsJson(res, { error: result.message, code: result.code }, result.status, origin)
      }
      return corsJson(res, { ok: true, booking: result.booking }, 200, origin)
    }

    if (role === 'renter') {
      const { data: student, error: stErr } = await admin
        .from('student_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (stErr || !student) {
        return corsJson(res, { error: 'Student profile not found' }, 404, origin)
      }

      const result = await runRecordRtaBondLodgement({
        admin,
        landlordProfileId: '',
        bookingId,
        rtaBondNumber: body.rtaBondNumber,
        rtaAcknowledgementReference: body.rtaAcknowledgementReference,
        rtaBondLodgedAt: body.rtaBondLodgedAt,
        actorRole: 'student',
        studentProfileId: student.id,
      })

      if (!result.ok) {
        return corsJson(res, { error: result.message, code: result.code }, result.status, origin)
      }
      return corsJson(res, { ok: true, booking: result.booking }, 200, origin)
    }

    return corsJson(res, { error: 'Forbidden' }, 403, origin)
  } catch (e) {
    console.error('booking-record-rta-bond', e)
    return corsJson(res, { error: 'Unexpected error' }, 500, origin)
  }
}
