// @ts-nocheck - Vercel api handler; strict typing deferred to shared leaseState helpers.
/**
 * Lease document state for a booking - used by both renter and landlord booking-detail
 * surfaces (Phase 3 / Task J).
 *
 * POST JSON: { booking_id: string }
 * Authorization: Bearer <Supabase access_token> - must be the landlord OR the student
 * on this booking.
 *
 * Returns:
 *   {
 *     state: 'none' | 'preview' | 'ready_to_sign' | 'awaiting_other' | 'fully_signed',
 *     viewer_role: 'landlord' | 'tenant',
 *     viewer_signed: boolean,
 *     counterparty_signed: boolean,
 *     preview_url?: string,         // signed URL for the draft (preview/ready/awaiting states)
 *     signing_url?: string,         // DocuSeal embed_src for the viewer (ready_to_sign only)
 *     signed_url?: string,          // legacy single signed PDF (fully_signed)
 *     signed_url_rta?: string,      // residential tenancy package - split signed PDFs
 *     signed_url_addendum?: string,
 *   }
 */
import { createClient } from '@supabase/supabase-js'
import { headerString, readJsonBody } from '../lib/nodeHandler.js'
import { deriveLeaseDocState } from '../lib/leaseState.js'
import { bookingRequiresCoTenantSignature } from '../lib/booking/coTenantSigning.js'
import {
  resolveSigningLinkUrl,
  signingPackageNeedsDateRefresh,
} from '../lib/docuseal/signLinkWrap.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

const SIGNED_URL_EXPIRY_SEC = 60 * 60 * 24 * 7

function parseBearerFromHeader(authHeader) {
  const m = /^Bearer\s+(.+)$/i.exec(authHeader.trim())
  return (m?.[1] ?? '').trim()
}

function pickEmbedSrc(submitters, role) {
  if (!Array.isArray(submitters)) return null
  const needle = role === 'landlord' ? 'landlord' : 'tenant'
  let firstSrc = null
  for (const s of submitters) {
    if (!s || typeof s !== 'object') continue
    const r = typeof s.role === 'string' ? s.role.toLowerCase() : ''
    const src = typeof s.embed_src === 'string' && s.embed_src.trim() ? s.embed_src.trim() : null
    if (!firstSrc && src) firstSrc = src
    if (r.includes(needle) && src) return src
  }
  return firstSrc
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
  if (!supabaseUrl || !serviceRole || !anonKey) {
    return res.status(500).json({ error: 'Server misconfigured' })
  }

  const bearer = parseBearerFromHeader(headerString(req.headers, 'authorization'))
  if (!bearer) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const authClient = createClient(supabaseUrl, anonKey)
  const {
    data: { user },
    error: userErr,
  } = await authClient.auth.getUser(bearer)
  if (userErr || !user?.id) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let body
  try {
    body = await readJsonBody(req)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const bookingId = typeof body.booking_id === 'string' ? body.booking_id.trim() : ''
  if (!bookingId) {
    return res.status(400).json({ error: 'booking_id is required' })
  }

  const admin = createClient(supabaseUrl, serviceRole)

  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(
      'id, landlord_id, student_id, status, service_tier_final, occupant_count, co_tenant, listing_agreement_status, listing_agreement_error',
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (bErr || !booking) {
    return res.status(404).json({ error: 'Booking not found' })
  }

  const { data: lp } = await admin.from('landlord_profiles').select('id').eq('user_id', user.id).maybeSingle()
  const { data: sp } = await admin.from('student_profiles').select('id').eq('user_id', user.id).maybeSingle()

  const isLandlord = Boolean(lp?.id) && booking.landlord_id === lp.id
  const isStudent = Boolean(sp?.id) && booking.student_id === sp.id
  if (!isLandlord && !isStudent) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const viewerRole = isLandlord ? 'landlord' : 'tenant'

  const { data: tenancy } = await admin
    .from('tenancies')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle()

  if (!tenancy) {
    const agreementStatus =
      typeof booking.listing_agreement_status === 'string' ? booking.listing_agreement_status : null
    let state = 'none'
    if (booking.service_tier_final === 'listing' && agreementStatus === 'pending') {
      state = 'agreement_preparing'
    } else if (booking.service_tier_final === 'listing' && agreementStatus === 'failed') {
      state = 'agreement_failed'
    }
    return res.status(200).json({
      state,
      viewer_role: viewerRole,
      viewer_signed: false,
      counterparty_signed: false,
      any_party_signed: false,
      listing_agreement_status: agreementStatus,
      listing_agreement_error:
        typeof booking.listing_agreement_error === 'string' ? booking.listing_agreement_error : null,
    })
  }

  const { data: docRows, error: dErr } = await admin
    .from('tenancy_documents')
    .select(
      'id, file_path, document_type, status, metadata, landlord_signed_at, student_signed_at, co_tenant_signed_at, docuseal_submission_id',
    )
    .eq('tenancy_id', tenancy.id)
    .in('document_type', ['lease', 'residential_tenancy'])

  if (dErr) {
    console.error('[lease-state] tenancy_documents', dErr)
    return res.status(500).json({ error: 'Could not load documents' })
  }

  const doc =
    (docRows ?? []).find((d) => d.document_type === 'residential_tenancy') ??
    (docRows ?? []).find((d) => d.document_type === 'lease') ??
    null

  if (!doc) {
    const agreementStatus =
      typeof booking.listing_agreement_status === 'string' ? booking.listing_agreement_status : null
    let state = 'none'
    if (booking.service_tier_final === 'listing' && agreementStatus === 'pending') {
      state = 'agreement_preparing'
    } else if (booking.service_tier_final === 'listing' && agreementStatus === 'failed') {
      state = 'agreement_failed'
    }
    return res.status(200).json({
      state,
      viewer_role: viewerRole,
      viewer_signed: false,
      counterparty_signed: false,
      any_party_signed: false,
      listing_agreement_status: agreementStatus,
      listing_agreement_error:
        typeof booking.listing_agreement_error === 'string' ? booking.listing_agreement_error : null,
    })
  }

  const coTenantSigningRequired = bookingRequiresCoTenantSignature(booking)

  const state = deriveLeaseDocState({
    bookingStatus: booking.status,
    serviceTierFinal: booking.service_tier_final,
    documentExists: true,
    documentStatus: doc.status,
    landlordSignedAt: doc.landlord_signed_at,
    studentSignedAt: doc.student_signed_at,
    coTenantSigningRequired,
    coTenantSignedAt: doc.co_tenant_signed_at,
    viewerRole,
  })

  const renterSideSigned =
    Boolean(doc.student_signed_at) &&
    (!coTenantSigningRequired || Boolean(doc.co_tenant_signed_at))

  const result = {
    state,
    viewer_role: viewerRole,
    co_tenant_signing_required: coTenantSigningRequired,
    co_tenant_signed: Boolean(doc.co_tenant_signed_at),
    any_party_signed: Boolean(
      doc.landlord_signed_at || doc.student_signed_at || doc.co_tenant_signed_at,
    ),
    viewer_signed:
      viewerRole === 'landlord'
        ? Boolean(doc.landlord_signed_at)
        : Boolean(doc.student_signed_at),
    counterparty_signed:
      viewerRole === 'landlord' ? renterSideSigned : Boolean(doc.landlord_signed_at),
  }

  const meta =
    doc.metadata && typeof doc.metadata === 'object' && !Array.isArray(doc.metadata)
      ? doc.metadata
      : {}

  if (state === 'preview' || state === 'ready_to_sign' || state === 'awaiting_other') {
    /** Preview / signable: surface the draft PDF for in-app viewing. */
    if (typeof doc.file_path === 'string' && doc.file_path) {
      const { data: signed, error: sErr } = await admin.storage
        .from('tenancy-documents')
        .createSignedUrl(doc.file_path, SIGNED_URL_EXPIRY_SEC)
      if (sErr) {
        console.error('[lease-state] preview signed URL', sErr)
      } else if (signed?.signedUrl) {
        result.preview_url = signed.signedUrl
      }
    }
  }

  if (state === 'ready_to_sign') {
    const docusealResp =
      meta.docuseal_response && typeof meta.docuseal_response === 'object'
        ? meta.docuseal_response
        : null
    const submitters = docusealResp && Array.isArray(docusealResp.submitters) ? docusealResp.submitters : []
    const signingPkg =
      typeof meta.signing_package === 'string' ? meta.signing_package : null
    const refreshDates = signingPackageNeedsDateRefresh(signingPkg)
    const rawSigningUrl = pickEmbedSrc(submitters, viewerRole)
    const matched =
      viewerRole === 'landlord'
        ? submitters.find((s) => {
            const r = typeof s?.role === 'string' ? s.role.toLowerCase() : ''
            return r.includes('landlord')
          }) ?? submitters[0]
        : submitters.find((s) => {
            const r = typeof s?.role === 'string' ? s.role.toLowerCase() : ''
            return r.includes('tenant')
          }) ?? submitters[1] ?? submitters[0]
    const signingUrl =
      rawSigningUrl && matched
        ? resolveSigningLinkUrl(matched, refreshDates) ?? rawSigningUrl
        : rawSigningUrl
    if (signingUrl) result.signing_url = signingUrl
  }

  if (state === 'fully_signed') {
    const rtaPath =
      typeof meta.signed_rta_file_path === 'string' && meta.signed_rta_file_path.trim()
        ? meta.signed_rta_file_path.trim()
        : ''
    const addendumPath =
      typeof meta.signed_addendum_file_path === 'string' && meta.signed_addendum_file_path.trim()
        ? meta.signed_addendum_file_path.trim()
        : ''

    if (rtaPath && addendumPath) {
      const [rta, add] = await Promise.all([
        admin.storage.from('tenancy-documents').createSignedUrl(rtaPath, SIGNED_URL_EXPIRY_SEC),
        admin.storage.from('tenancy-documents').createSignedUrl(addendumPath, SIGNED_URL_EXPIRY_SEC),
      ])
      if (rta.data?.signedUrl) {
        result.signed_url_rta = rta.data.signedUrl
        result.signed_url = rta.data.signedUrl
      }
      if (add.data?.signedUrl) result.signed_url_addendum = add.data.signedUrl
    } else if (typeof doc.file_path === 'string' && doc.file_path) {
      const { data: signed, error: sErr } = await admin.storage
        .from('tenancy-documents')
        .createSignedUrl(doc.file_path, SIGNED_URL_EXPIRY_SEC)
      if (sErr) {
        console.error('[lease-state] signed URL', sErr)
      } else if (signed?.signedUrl) {
        result.signed_url = signed.signedUrl
      }
    }
  }

  return res.status(200).json(result)
}
