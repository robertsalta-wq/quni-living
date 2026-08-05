// @ts-nocheck - Return mutual-termination DocuSeal signing URL for the viewer.
import { createClient } from '@supabase/supabase-js'
import { headerString, readJsonBody } from './lib/nodeHandler.js'
import { resolveSigningLinkUrl } from './lib/docuseal/signLinkWrap.js'

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
      .select('id, landlord_id, student_id, status')
      .eq('id', bookingId)
      .maybeSingle()
    if (!booking) return corsJson(res, { error: 'Booking not found' }, 404, origin)

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

    let viewerRole = null
    if (landlord && booking.landlord_id === landlord.id) viewerRole = 'landlord'
    else if (student && booking.student_id === student.id) viewerRole = 'tenant'
    if (!viewerRole) return corsJson(res, { error: 'Forbidden' }, 403, origin)

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
    const cached =
      viewerRole === 'landlord'
        ? typeof meta.landlord_signing_url === 'string'
          ? meta.landlord_signing_url.trim()
          : ''
        : typeof meta.tenant_signing_url === 'string'
          ? meta.tenant_signing_url.trim()
          : ''

    const viewerSigned =
      viewerRole === 'landlord' ? Boolean(doc.landlord_signed_at) : Boolean(doc.student_signed_at)
    const otherSigned =
      viewerRole === 'landlord' ? Boolean(doc.student_signed_at) : Boolean(doc.landlord_signed_at)

    if (doc.status === 'signed' || (viewerSigned && otherSigned)) {
      return corsJson(
        res,
        {
          ok: true,
          documentStatus: 'signed',
          viewerSigned: true,
          otherSigned: true,
          signingUrl: null,
        },
        200,
        origin,
      )
    }

    if (viewerSigned) {
      return corsJson(
        res,
        {
          ok: true,
          documentStatus: doc.status,
          viewerSigned: true,
          otherSigned,
          signingUrl: null,
        },
        200,
        origin,
      )
    }

    let signingUrl = cached || null
    if (!signingUrl) {
      const docusealResp =
        meta.docuseal_response && typeof meta.docuseal_response === 'object'
          ? meta.docuseal_response
          : null
      const submitters = docusealResp && Array.isArray(docusealResp.submitters) ? docusealResp.submitters : []
      const matched = pickSubmitter(submitters, viewerRole)
      if (matched) {
        signingUrl = resolveSigningLinkUrl(matched, false) || matched.embed_src || null
      }
    }

    return corsJson(
      res,
      {
        ok: true,
        documentStatus: doc.status,
        viewerSigned: false,
        otherSigned,
        signingUrl: typeof signingUrl === 'string' && signingUrl.trim() ? signingUrl.trim() : null,
        submissionId: doc.docuseal_submission_id,
      },
      200,
      origin,
    )
  } catch (e) {
    console.error('booking-mutual-termination-signing', e)
    return corsJson(res, { error: 'Unexpected error' }, 500, origin)
  }
}
