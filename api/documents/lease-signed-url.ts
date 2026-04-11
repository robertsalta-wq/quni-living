// @ts-nocheck
/**
 * Signed download URL for a signed lease / residential tenancy agreement (private bucket).
 *
 * POST JSON: { booking_id: string }
 * Authorization: Bearer <Supabase access_token> — must be landlord or student on the booking.
 *
 * Looks up tenancy_documents with document_type `lease` or `residential_tenancy` and status `signed`.
 *
 * NSW residential package: returns `signed_url_rta` and `signed_url_addendum` when both files exist
 * (separate PDFs from DocuSeal — not merged server-side for download). Legacy rows may only return `signed_url`.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY
 */
import { createClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../src/lib/database.types'
import {
  downloadSignedResidentialTenancyPackagePartsFromDocuseal,
  downloadSignedSubmissionPdfFromDocuseal,
} from '../lib/docuseal.js'
import { headerString, readJsonBody } from '../lib/nodeHandler.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

/** 7 days — signed URL lifetime for agreement PDFs */
const SIGNED_URL_EXPIRY_SEC = 7 * 24 * 60 * 60

function parseBearerFromHeader(authHeader: string): string {
  const h = authHeader.trim()
  const m = /^Bearer\s+(.+)$/i.exec(h)
  return (m?.[1] ?? '').trim()
}

export default async function handler(req: any, res: any) {
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

  let body: { booking_id?: string }
  try {
    body = (await readJsonBody(req)) as { booking_id?: string }
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const bookingId = typeof body.booking_id === 'string' ? body.booking_id.trim() : ''
  if (!bookingId) {
    return res.status(400).json({ error: 'booking_id is required' })
  }

  const admin = createClient<Database>(supabaseUrl, serviceRole)

  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, landlord_id, student_id')
    .eq('id', bookingId)
    .maybeSingle()

  if (bErr || !booking) {
    return res.status(404).json({ error: 'Booking not found' })
  }

  const { data: lp } = await admin.from('landlord_profiles').select('id').eq('user_id', user.id).maybeSingle()

  const { data: sp } = await admin.from('student_profiles').select('id').eq('user_id', user.id).maybeSingle()

  const isLandlord = lp?.id && booking.landlord_id === lp.id
  const isStudent = sp?.id && booking.student_id === sp.id
  if (!isLandlord && !isStudent) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { data: tenancy, error: tErr } = await admin.from('tenancies').select('id').eq('booking_id', bookingId).maybeSingle()

  if (tErr || !tenancy) {
    return res.status(404).json({ error: 'Tenancy not found for this booking' })
  }

  const { data: docRows, error: dErr } = await admin
    .from('tenancy_documents')
    .select('id, file_path, document_type, docuseal_submission_id, metadata')
    .eq('tenancy_id', tenancy.id)
    .in('document_type', ['lease', 'residential_tenancy'])
    .eq('status', 'signed')

  if (dErr) {
    console.error('[lease-signed-url] tenancy_documents', dErr)
    return res.status(500).json({ error: 'Could not load documents' })
  }

  const withPath = (docRows ?? []).filter((d) => typeof d.file_path === 'string' && d.file_path.length > 0)
  const doc =
    withPath.find((d) => d.document_type === 'residential_tenancy') ?? withPath.find((d) => d.document_type === 'lease')

  if (!doc?.file_path) {
    return res.status(404).json({ error: 'Signed agreement not available yet' })
  }

  let rowMeta =
    doc.metadata && typeof doc.metadata === 'object' && !Array.isArray(doc.metadata)
      ? ({ ...(doc.metadata as Record<string, unknown>) } as Record<string, unknown>)
      : {}
  const submissionId =
    typeof doc.docuseal_submission_id === 'string' ? doc.docuseal_submission_id.trim() : ''
  const refreshFromDocuseal =
    doc.document_type === 'residential_tenancy' &&
    rowMeta.signing_package === 'residential_tenancy' &&
    Boolean(submissionId)

  const rtaStoragePath = `${tenancy.id}/residential_tenancy/nsw_residential_tenancy_agreement_signed.pdf`
  const addendumStoragePath = `${tenancy.id}/residential_tenancy/quni_platform_addendum_signed.pdf`
  const legacyCombinedPath = `${tenancy.id}/residential_tenancy/residential_tenancy_agreement_and_addendum_signed.pdf`

  if (refreshFromDocuseal) {
    try {
      const dual = await downloadSignedResidentialTenancyPackagePartsFromDocuseal(submissionId)
      if (dual) {
        const { error: upRta } = await admin.storage
          .from('tenancy-documents')
          .upload(rtaStoragePath, dual.rta, { contentType: 'application/pdf', upsert: true })
        const { error: upAdd } = await admin.storage
          .from('tenancy-documents')
          .upload(addendumStoragePath, dual.addendum, { contentType: 'application/pdf', upsert: true })
        if (upRta) console.error('[lease-signed-url] storage sync RTA', upRta)
        if (upAdd) console.error('[lease-signed-url] storage sync addendum', upAdd)
        if (!upRta && !upAdd) {
          rowMeta = {
            ...rowMeta,
            signed_rta_file_path: rtaStoragePath,
            signed_addendum_file_path: addendumStoragePath,
          }
          const { error: metaErr } = await admin
            .from('tenancy_documents')
            .update({
              file_path: rtaStoragePath,
              metadata: rowMeta as Json,
            })
            .eq('id', doc.id)
          if (metaErr) console.error('[lease-signed-url] tenancy_documents update (dual)', metaErr)
        }
      } else {
        const pdfBuf = await downloadSignedSubmissionPdfFromDocuseal(submissionId, true)
        const { error: upErr } = await admin.storage
          .from('tenancy-documents')
          .upload(legacyCombinedPath, pdfBuf, { contentType: 'application/pdf', upsert: true })
        if (upErr) {
          console.error('[lease-signed-url] storage sync from DocuSeal (merged)', upErr)
        } else {
          const { error: pathErr } = await admin
            .from('tenancy_documents')
            .update({ file_path: legacyCombinedPath })
            .eq('id', doc.id)
          if (pathErr) console.error('[lease-signed-url] tenancy_documents path (merged)', pathErr)
          else doc.file_path = legacyCombinedPath
        }
      }
    } catch (e) {
      console.error('[lease-signed-url] DocuSeal package fetch', e)
    }
  }

  const rtaPath =
    typeof rowMeta.signed_rta_file_path === 'string' && rowMeta.signed_rta_file_path.trim().length > 0
      ? rowMeta.signed_rta_file_path.trim()
      : ''
  const addendumPath =
    typeof rowMeta.signed_addendum_file_path === 'string' && rowMeta.signed_addendum_file_path.trim().length > 0
      ? rowMeta.signed_addendum_file_path.trim()
      : ''

  if (rtaPath && addendumPath) {
    const { data: rtaSigned, error: rtaErr } = await admin.storage
      .from('tenancy-documents')
      .createSignedUrl(rtaPath, SIGNED_URL_EXPIRY_SEC)
    const { data: addSigned, error: addErr } = await admin.storage
      .from('tenancy-documents')
      .createSignedUrl(addendumPath, SIGNED_URL_EXPIRY_SEC)
    if (rtaErr || addErr || !rtaSigned?.signedUrl || !addSigned?.signedUrl) {
      console.error('[lease-signed-url] dual signed URL', rtaErr, addErr)
      return res.status(500).json({ error: 'Could not create download link' })
    }
    return res.status(200).json({
      ok: true,
      signed_url: rtaSigned.signedUrl,
      signed_url_rta: rtaSigned.signedUrl,
      signed_url_addendum: addSigned.signedUrl,
      expires_in: SIGNED_URL_EXPIRY_SEC,
    })
  }

  const { data: signed, error: sErr } = await admin.storage
    .from('tenancy-documents')
    .createSignedUrl(doc.file_path, SIGNED_URL_EXPIRY_SEC)

  if (sErr || !signed?.signedUrl) {
    console.error('[lease-signed-url]', sErr)
    return res.status(500).json({ error: 'Could not create download link' })
  }

  return res.status(200).json({
    ok: true,
    signed_url: signed.signedUrl,
    expires_in: SIGNED_URL_EXPIRY_SEC,
  })
}
