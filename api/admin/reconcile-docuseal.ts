/**
 * POST /api/admin/reconcile-docuseal
 * Admin backstop: sync platform state to a fully-signed DocuSeal submission.
 */
// @ts-nocheck - Vercel isolated API TS pass.
import { createClient } from '@supabase/supabase-js'

import { requireAdminUser } from '../lib/adminAuth.js'
import {
  fetchDocusealSubmission,
  findBondPendingExpiredRefundMarker,
  isCoTenantRequiredForTenancy,
  isDocusealReconcileInSync,
  isSubmissionFullySignedOnDocuseal,
  isWithdrawnBookingStatus,
  loadLatestLeaseDocForBooking,
  reinstateBookingAfterDocusealReconcile,
  summarizeSubmitters,
  syncFullySignedDocusealSubmission,
} from '../lib/docuseal/reconcileFromDocuseal.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
}

const REFUND_WARNING =
  'Booking reinstated; listing fee was refunded on expiry — confirm payment separately.'

function json(body: unknown, status = 200, origin: string) {
  const allowOrigin = origin || '*'
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'no-store',
    },
  })
}

function parseSigningPackage(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const pkg = (metadata as Record<string, unknown>).signing_package
  return typeof pkg === 'string' ? pkg : null
}

export default async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin)
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500, origin)
  }

  const authResult = await requireAdminUser(request, supabaseUrl, anonKey)
  if ('error' in authResult) {
    return json({ error: authResult.error }, authResult.status, origin)
  }
  const { user } = authResult

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400, origin)
  }

  const rawBookingId =
    body && typeof body === 'object' ? (body as Record<string, unknown>).bookingId : null
  const bookingId = typeof rawBookingId === 'string' ? rawBookingId.trim() : ''
  if (!bookingId) {
    return json({ error: 'bookingId is required' }, 400, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)

  try {
    const { data: booking, error: bookingErr } = await admin
      .from('bookings')
      .select(
        'id, status, bond_received_by_landlord_at, service_tier_final, listing_agreement_status, property_id, landlord_id, student_id, expired_at',
      )
      .eq('id', bookingId)
      .maybeSingle()

    if (bookingErr) {
      console.error('[api/admin/reconcile-docuseal] booking load', bookingErr.message)
      return json({ error: bookingErr.message }, 500, origin)
    }
    if (!booking) {
      return json({ error: 'Booking not found' }, 404, origin)
    }

    const refundMarker = await findBondPendingExpiredRefundMarker(admin, bookingId)

    if (isWithdrawnBookingStatus(booking.status)) {
      return json(
        {
          ok: false,
          message: "Won't reinstate withdrawn booking.",
          bookingStatus: booking.status,
        },
        200,
        origin,
      )
    }

    const { tenancy, doc } = await loadLatestLeaseDocForBooking(admin, bookingId)
    if (!doc?.docuseal_submission_id) {
      return json({ error: 'No lease document with a DocuSeal submission id' }, 404, origin)
    }

    const submissionId = doc.docuseal_submission_id.trim()
    const submissionPayload = await fetchDocusealSubmission(submissionId)

    const signingPkg = parseSigningPackage(doc.metadata)
    const isResidentialTenancyPackage =
      signingPkg === 'residential_tenancy' ||
      signingPkg === 'residential_tenancy_qld' ||
      signingPkg === 'residential_tenancy_vic'

    const coTenantRequired = doc.tenancy_id
      ? await isCoTenantRequiredForTenancy(admin, doc.tenancy_id, isResidentialTenancyPackage)
      : false

    if (!isSubmissionFullySignedOnDocuseal(submissionPayload, coTenantRequired)) {
      return json(
        {
          ok: false,
          message: 'DocuSeal submission is not fully signed.',
          submitters: summarizeSubmitters(submissionPayload),
        },
        200,
        origin,
      )
    }

    const bookingRow = {
      id: booking.id,
      status: booking.status,
      bond_received_by_landlord_at: booking.bond_received_by_landlord_at,
      service_tier_final: booking.service_tier_final,
      listing_agreement_status: booking.listing_agreement_status,
      property_id: booking.property_id,
      landlord_id: booking.landlord_id,
      student_id: booking.student_id,
      expired_at: booking.expired_at,
    }

    const alreadyInSync = await isDocusealReconcileInSync({
      admin,
      docRow: doc,
      submissionPayload,
      booking: bookingRow,
      coTenantRequired,
    })

    if (alreadyInSync) {
      return json(
        {
          ok: true,
          message: 'Already in sync.',
          changes: [],
          ...(refundMarker.found ? { warning: REFUND_WARNING } : {}),
        },
        200,
        origin,
      )
    }

    const bookingStatusBefore = booking.status
    const docStatusBefore = doc.status

    const reconciledAt = new Date().toISOString()
    const syncResult = await syncFullySignedDocusealSubmission({
      admin,
      docRow: doc,
      submissionId,
      submissionPayload,
      metadataExtra: {
        reconciled: {
          reason: 'missed_completion_webhook',
          docuseal_submission_id: submissionId,
          admin_user_id: user.id,
          reconciled_at: reconciledAt,
        },
      },
    })

    const reinstateResult = await reinstateBookingAfterDocusealReconcile({
      admin,
      booking: bookingRow,
      tenancy,
    })

    const changes = [
      ...(docStatusBefore === 'archived' ? ['tenancy_document: archived → signed'] : []),
      ...(docStatusBefore !== 'signed' && docStatusBefore !== 'archived'
        ? [`tenancy_document: ${docStatusBefore} → signed`]
        : []),
      'signed PDF uploaded to tenancy-documents',
      ...reinstateResult.changes,
    ]

    const auditMetadata = {
      docuseal_submission_id: submissionId,
      admin_user_id: user.id,
      reconciled_at: reconciledAt,
      booking_status_before: bookingStatusBefore,
      booking_status_after: reinstateResult.bookingStatusAfter,
      doc_status_before: docStatusBefore,
      doc_status_after: 'signed',
      changes,
      signed_path: syncResult.signedPath,
      ...(refundMarker.found ? { listing_fee_refunded_on_expiry: true, refund_metadata: refundMarker.metadata } : {}),
    }

    const { error: evErr } = await admin.from('service_tier_events').insert({
      booking_id: booking.id,
      property_id: booking.property_id,
      landlord_id: booking.landlord_id,
      student_id: booking.student_id,
      event_type: 'reconciled_from_docuseal',
      service_tier: booking.service_tier_final,
      metadata: auditMetadata,
    })

    if (evErr) {
      console.error('[api/admin/reconcile-docuseal] service_tier_events insert', evErr)
    }

    return json(
      {
        ok: true,
        message: 'Reconciled from DocuSeal.',
        changes,
        submitters: summarizeSubmitters(submissionPayload),
        signedPath: syncResult.signedPath,
        ...(refundMarker.found ? { warning: REFUND_WARNING } : {}),
      },
      200,
      origin,
    )
  } catch (e) {
    console.error('[api/admin/reconcile-docuseal]', e)
    const msg = e instanceof Error ? e.message : String(e)
    return json({ error: msg }, 500, origin)
  }
}
