// @ts-nocheck - Return mutual-termination DocuSeal signing URL; optional Quni email resend.
import { createClient } from '@supabase/supabase-js'
import { headerString, readJsonBody } from './lib/nodeHandler.js'
import { resolveSigningLinkUrl } from './lib/docuseal/signLinkWrap.js'
import { sendMutualTerminationSigningEmails } from './lib/booking/termination/sendMutualTerminationSigningEmails.js'

export const config = { runtime: 'nodejs', maxDuration: 30 }

function corsJson(res, body, status = 200, origin) {
  const allowOrigin = origin || '*'
  res.setHeader('Access-Control-Allow-Origin', allowOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  return res.status(status).json(body)
}

function pickSubmitter(submitters, viewerRole) {
  if (!Array.isArray(submitters)) return null
  const wantLandlord = viewerRole === 'landlord'
  for (const s of submitters) {
    if (!s || typeof s !== 'object') continue
    const r = typeof s.role === 'string' ? s.role.toLowerCase() : ''
    if (wantLandlord && (r.includes('first') || r.includes('landlord'))) return s
    if (!wantLandlord && (r.includes('second') || r.includes('tenant'))) return s
  }
  return wantLandlord ? submitters[0] : submitters[1] || submitters[0]
}

function resolvePartyUrl(meta, submitters, role) {
  const cachedKey = role === 'landlord' ? 'landlord_signing_url' : 'tenant_signing_url'
  const cached = typeof meta[cachedKey] === 'string' ? meta[cachedKey].trim() : ''
  if (cached) return cached
  const matched = pickSubmitter(submitters, role)
  if (!matched) return null
  return resolveSigningLinkUrl(matched, false) || matched.embed_src || null
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
  const resendEmails = body.resendEmails === true
  if (!bookingId) {
    return corsJson(res, { error: 'bookingId is required' }, 400, origin)
  }

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
    const { data: booking } = await admin
      .from('bookings')
      .select(
        'id, landlord_id, student_id, status, termination_effective_date, property_id, properties ( address, suburb, state, postcode )',
      )
      .eq('id', bookingId)
      .maybeSingle()
    if (!booking) return corsJson(res, { error: 'Booking not found' }, 404, origin)

    const { data: landlord } = await admin
      .from('landlord_profiles')
      .select('id, full_name, first_name, last_name, email')
      .eq('user_id', user.id)
      .maybeSingle()
    const { data: student } = await admin
      .from('student_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    let viewerRole = null
    if (landlord && booking.landlord_id === landlord.id) viewerRole = 'landlord'
    else if (student && booking.student_id === student.id) viewerRole = 'tenant'
    if (!viewerRole) return corsJson(res, { error: 'Forbidden' }, 403, origin)

    if (resendEmails && viewerRole !== 'landlord') {
      return corsJson(res, { error: 'Only the landlord can resend signing emails' }, 403, origin)
    }

    const { data: tenancy } = await admin
      .from('tenancies')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle()
    if (!tenancy?.id) {
      return corsJson(res, { error: 'No tenancy for booking', code: 'no_tenancy' }, 404, origin)
    }

    const { data: doc } = await admin
      .from('tenancy_documents')
      .select('id, status, landlord_signed_at, student_signed_at, metadata, docuseal_submission_id')
      .eq('tenancy_id', tenancy.id)
      .eq('document_type', 'mutual_termination')
      .maybeSingle()

    if (!doc) {
      return corsJson(res, { error: 'Mutual termination document not found', code: 'no_doc' }, 404, origin)
    }

    const meta = doc.metadata && typeof doc.metadata === 'object' && !Array.isArray(doc.metadata) ? doc.metadata : {}
    const docusealResp =
      meta.docuseal_response && typeof meta.docuseal_response === 'object' ? meta.docuseal_response : null
    const submitters = docusealResp && Array.isArray(docusealResp.submitters) ? docusealResp.submitters : []

    const landlordSigningUrl = resolvePartyUrl(meta, submitters, 'landlord')
    const tenantSigningUrl = resolvePartyUrl(meta, submitters, 'tenant')
    const signingUrl = viewerRole === 'landlord' ? landlordSigningUrl : tenantSigningUrl

    const viewerSigned =
      viewerRole === 'landlord' ? Boolean(doc.landlord_signed_at) : Boolean(doc.student_signed_at)
    const otherSigned =
      viewerRole === 'landlord' ? Boolean(doc.student_signed_at) : Boolean(doc.landlord_signed_at)

    let emails = null
    if (resendEmails && doc.status !== 'signed') {
      const { data: lp } = await admin
        .from('landlord_profiles')
        .select('full_name, first_name, last_name, email')
        .eq('id', booking.landlord_id)
        .maybeSingle()
      const { data: sp } = await admin
        .from('student_profiles')
        .select('full_name, first_name, last_name, email')
        .eq('id', booking.student_id)
        .maybeSingle()

      const landlordName =
        [lp?.first_name, lp?.last_name].filter(Boolean).join(' ').trim() ||
        (typeof lp?.full_name === 'string' ? lp.full_name.trim() : '') ||
        'Landlord'
      const tenantName =
        [sp?.first_name, sp?.last_name].filter(Boolean).join(' ').trim() ||
        (typeof sp?.full_name === 'string' ? sp.full_name.trim() : '') ||
        'Tenant'
      const landlordEmail = typeof lp?.email === 'string' ? lp.email.trim() : ''
      const tenantEmail = typeof sp?.email === 'string' ? sp.email.trim() : ''
      const prop = booking.properties
      const premisesLine = [prop?.address, prop?.suburb, prop?.state, prop?.postcode]
        .filter(Boolean)
        .join(', ')

      if (!landlordEmail || !tenantEmail || !landlordSigningUrl || !tenantSigningUrl) {
        return corsJson(
          res,
          { error: 'Missing party email or signing link for resend', code: 'resend_incomplete' },
          409,
          origin,
        )
      }

      emails = await sendMutualTerminationSigningEmails({
        landlordName,
        landlordEmail,
        landlordSigningUrl,
        tenantName,
        tenantEmail,
        tenantSigningUrl,
        premisesLine: premisesLine || 'the Premises',
        terminationEffectiveDate:
          typeof booking.termination_effective_date === 'string'
            ? booking.termination_effective_date
            : '',
      })
    }

    if (doc.status === 'signed' || (viewerSigned && otherSigned)) {
      return corsJson(
        res,
        {
          ok: true,
          documentStatus: 'signed',
          viewerSigned: true,
          otherSigned: true,
          signingUrl: null,
          emails,
        },
        200,
        origin,
      )
    }

    return corsJson(
      res,
      {
        ok: true,
        documentStatus: doc.status,
        viewerSigned,
        otherSigned,
        signingUrl:
          !viewerSigned && typeof signingUrl === 'string' && signingUrl.trim()
            ? signingUrl.trim()
            : null,
        submissionId: doc.docuseal_submission_id,
        emails,
      },
      200,
      origin,
    )
  } catch (e) {
    console.error('booking-mutual-termination-signing', e)
    return corsJson(res, { error: 'Unexpected error' }, 500, origin)
  }
}
