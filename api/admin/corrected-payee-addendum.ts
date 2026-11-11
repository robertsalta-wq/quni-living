// @ts-nocheck
/**
 * Admin: build a corrected payee addendum for an existing booking.
 * POST JSON: { bookingId: string, send?: boolean }
 * send false returns the PDF and does not contact DocuSeal or the parties.
 * send true creates a DocuSeal submission for both parties (and a co-tenant when present).
 */
import { createClient } from '@supabase/supabase-js'
import { requireAdminUser } from '../lib/adminAuth.js'
import { headerString, readJsonBody } from '../lib/nodeHandler.js'
import { createDocusealSubmissionFromPdf } from '../lib/docuseal.shared.js'
import { loadLandlordPayoutBankForDocument } from '../lib/documents/listingTenancyGeneration/landlordPayoutBank.js'
import {
  buildCorrectedPayeeAddendumPdf,
  coTenantFromBooking,
  correctedAddendumHasPayee,
} from '../lib/documents/correctedPayeeAddendum.js'

export const config = { runtime: 'nodejs', maxDuration: 60 }

function corsJson(res, body, status = 200, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).json(body)
}

function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString('base64')
}

export default async function handler(req, res) {
  const origin = headerString(req.headers, 'origin') || '*'
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    return res.status(204).end()
  }
  if (req.method !== 'POST') return corsJson(res, { error: 'Method not allowed' }, 405, origin)

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
  if (!supabaseUrl || !serviceRole || !anonKey) {
    return corsJson(res, { error: 'Server misconfigured' }, 500, origin)
  }

  const authRequest = {
    headers: { get: (name) => headerString(req.headers, String(name).toLowerCase()) || null },
  }
  const authResult = await requireAdminUser(authRequest, supabaseUrl, anonKey)
  if ('error' in authResult) {
    return corsJson(res, { error: authResult.error }, authResult.status, origin)
  }

  let body
  try {
    body = await readJsonBody(req)
  } catch {
    return corsJson(res, { error: 'Invalid JSON' }, 400, origin)
  }
  const rec = body && typeof body === 'object' ? body : {}
  const bookingId = typeof rec.bookingId === 'string' ? rec.bookingId.trim() : ''
  const send = rec.send === true
  if (!bookingId) return corsJson(res, { error: 'bookingId is required' }, 400, origin)

  const admin = createClient(supabaseUrl, serviceRole)
  const { data: booking, error: bookingErr } = await admin
    .from('bookings')
    .select('id, landlord_id, student_id, property_id, co_tenant, properties ( title, address, suburb, state )')
    .eq('id', bookingId)
    .maybeSingle()
  if (bookingErr || !booking) {
    return corsJson(res, { error: 'Booking not found' }, 404, origin)
  }

  const [{ data: landlord }, { data: renter }] = await Promise.all([
    admin.from('landlord_profiles').select('full_name, company_name, email').eq('id', booking.landlord_id).maybeSingle(),
    admin.from('student_profiles').select('full_name, email').eq('id', booking.student_id).maybeSingle(),
  ])

  const payout = await loadLandlordPayoutBankForDocument(admin, booking.property_id)
  const bank = payout.ok ? payout.bankDetails : null
  const prop = Array.isArray(booking.properties) ? booking.properties[0] : booking.properties
  const propertyLine = [prop?.title, prop?.address, prop?.suburb, prop?.state].filter(Boolean).join(', ')
  const co = coTenantFromBooking(booking.co_tenant)
  const input = {
    bookingReference: booking.id.slice(0, 8),
    propertyLine: propertyLine || 'Room',
    landlordName: (landlord?.full_name || landlord?.company_name || 'Landlord').trim(),
    renterName: (renter?.full_name || 'Renter').trim(),
    coTenantName: co?.fullName ?? null,
    accountName: bank?.accountName ?? null,
    bsb: bank?.bsb ?? null,
    accountNumber: bank?.accountNumber ?? null,
    bankName: bank?.bankName ?? null,
  }
  const pdf = await buildCorrectedPayeeAddendumPdf(input)
  const hasPayee = correctedAddendumHasPayee(input)

  if (!send) {
    return corsJson(res, { ok: true, sent: false, hasPayee, pdfBase64: bytesToBase64(pdf) }, 200, origin)
  }
  if (!hasPayee) {
    return corsJson(
      res,
      { error: 'Payee bank details are incomplete. Save them on the property before sending.' },
      400,
      origin,
    )
  }
  const landlordEmail = landlord?.email?.trim() || ''
  const renterEmail = renter?.email?.trim() || ''
  if (!landlordEmail || !renterEmail) {
    return corsJson(res, { error: 'Both parties need an email address before this can be sent.' }, 400, origin)
  }

  const { data: tenancy, error: tenancyErr } = await admin
    .from('tenancies')
    .select('id')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (tenancyErr || !tenancy?.id) {
    return corsJson(res, { error: 'This booking has no tenancy to attach the addendum to.' }, 409, origin)
  }

  const path = `corrected-addenda/${bookingId}/${Date.now()}.pdf`
  const { error: upErr } = await admin.storage.from('tenancy-documents').upload(path, pdf, {
    contentType: 'application/pdf',
    upsert: false,
  })
  if (upErr) {
    console.error('[corrected-addendum] upload', upErr)
    return corsJson(res, { error: 'Could not store the addendum.' }, 503, origin)
  }

  let submission
  try {
    submission = await createDocusealSubmissionFromPdf({
      name: `Corrected addendum ${input.bookingReference}`,
      documentPdfName: 'Corrected addendum.pdf',
      pdfBase64: bytesToBase64(pdf),
      sendEmail: true,
      order: 'random',
      landlordRole: 'First Party',
      tenantRole: 'Second Party',
      coTenantRole: 'Co-tenant',
      landlord: { name: input.landlordName, email: landlordEmail },
      tenant: { name: input.renterName, email: renterEmail },
      coTenant: co ? { name: co.fullName, email: co.email } : null,
    })
  } catch (e) {
    console.error('[corrected-addendum] docuseal', e)
    return corsJson(res, { error: 'Could not send the addendum for signature.' }, 502, origin)
  }

  const submissionId = submission?.id != null ? String(submission.id) : null
  const { error: docErr } = await admin.from('tenancy_documents').insert({
    tenancy_id: tenancy.id,
    document_type: 'other',
    status: 'sent_for_signing',
    file_path: path,
    docuseal_submission_id: submissionId,
    generated_by: authResult.user?.id ?? null,
    metadata: {
      document_kind: 'corrected_payee_addendum',
      booking_id: bookingId,
    },
  })
  if (docErr) console.error('[corrected-addendum] document row', docErr)

  return corsJson(res, { ok: true, sent: true, hasPayee, submissionId }, 200, origin)
}
