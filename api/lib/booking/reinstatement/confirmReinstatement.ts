import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchDocusealSubmission,
  findBondPendingExpiredRefundMarker,
  isCoTenantRequiredForTenancy,
  isSubmissionFullySignedOnDocuseal,
  isWithdrawnBookingStatus,
  loadLatestLeaseDocForBooking,
  reinstateBookingAfterDocusealReconcile,
  syncFullySignedDocusealSubmission,
} from '../../docuseal/reconcileFromDocuseal.js'
import { resetTenancyDocumentForNewSigningRound } from '../resetTenancyDocumentForNewSigningRound.js'
import { triggerListingDocumentGeneration } from '../triggerListingDocumentGeneration.js'
import { recordBookingEvent } from '../events/recordBookingEvent.js'
import { isPropertyBlockedForReinstatement } from './availability.js'
import type { PartyOfBooking } from './assertPartyOfBooking.js'
import {
  REINSTATE_FEE_FREE_FLAGGED,
  type ReinstatementFeeAction,
  validateV1FeeAction,
} from './constants.js'
import { parseOptionalFeeAction } from './eligibility.js'
import {
  lazyExpireReinstatementRequest,
  loadReinstatementRequestById,
  type ReinstatementRequestRow,
} from './requestRows.js'
import {
  sendReinstatementBlockedUnavailableEmails,
  sendReinstatementConfirmedEmails,
} from './emails.js'

function parseSigningPackage(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const pkg = (metadata as Record<string, unknown>).signing_package
  return typeof pkg === 'string' ? pkg : null
}

export type ConfirmReinstatementResult =
  | {
      ok: true
      alreadyReinstated?: boolean
      request: ReinstatementRequestRow
      bookingStatusAfter: string
      signing_needs_resend: boolean
      signing_resend_failed: boolean
      fee_action: ReinstatementFeeAction
      listing_fee_refunded: boolean
    }
  | {
      ok: false
      status: number
      error: string
      code?: string
      request?: ReinstatementRequestRow
    }

async function markRequestStatus(
  admin: SupabaseClient,
  requestId: string,
  patch: Record<string, unknown>,
): Promise<ReinstatementRequestRow | null> {
  const nowIso = new Date().toISOString()
  const { data, error } = await admin
    .from('booking_reinstatement_requests')
    .update({ ...patch, updated_at: nowIso })
    .eq('id', requestId)
    .eq('status', 'pending_confirmation')
    .select(
      'id, booking_id, requested_by, requested_by_role, requested_at, grace_window_expires_at, status, requested_fee_action, confirmed_by, confirmed_at, fee_action, metadata, created_at, updated_at',
    )
    .maybeSingle()
  if (error) throw error
  return (data as ReinstatementRequestRow | null) ?? null
}

export async function confirmReinstatement(args: {
  admin: SupabaseClient
  party: PartyOfBooking
  requestId: string
  feeAction?: unknown
}): Promise<ConfirmReinstatementResult> {
  const { admin, party } = args
  const requestId = typeof args.requestId === 'string' ? args.requestId.trim() : ''
  if (!requestId) {
    return { ok: false, status: 400, error: 'requestId is required', code: 'missing_request_id' }
  }

  let request = await loadReinstatementRequestById(admin, requestId)
  if (!request || request.booking_id !== party.booking.id) {
    return { ok: false, status: 404, error: 'Reinstatement request not found', code: 'not_found' }
  }

  request = await lazyExpireReinstatementRequest(admin, request)
  if (request.status === 'window_expired') {
    return {
      ok: false,
      status: 409,
      error: 'This reinstatement request has expired.',
      code: 'window_expired',
      request,
    }
  }
  if (request.status !== 'pending_confirmation') {
    if (party.booking.status !== 'expired') {
      return {
        ok: true,
        alreadyReinstated: true,
        request,
        bookingStatusAfter: party.booking.status,
        signing_needs_resend: false,
        signing_resend_failed: false,
        fee_action: REINSTATE_FEE_FREE_FLAGGED,
        listing_fee_refunded: false,
      }
    }
    return {
      ok: false,
      status: 409,
      error: `Request is ${request.status}.`,
      code: 'not_pending',
      request,
    }
  }

  if (request.requested_by === party.authUserId) {
    return {
      ok: false,
      status: 403,
      error: 'You cannot confirm your own reinstatement request.',
      code: 'self_confirm',
      request,
    }
  }

  const expectedConfirmerRole = request.requested_by_role === 'landlord' ? 'tenant' : 'landlord'
  if (party.role !== expectedConfirmerRole) {
    return {
      ok: false,
      status: 403,
      error: 'Only the other party can confirm this request.',
      code: 'wrong_party',
      request,
    }
  }

  const booking = party.booking
  if (isWithdrawnBookingStatus(booking.status)) {
    return {
      ok: false,
      status: 409,
      error: 'Withdrawn bookings cannot be reinstated.',
      code: 'withdrawn',
      request,
    }
  }

  if (booking.status !== 'expired') {
    const confirmed = await markRequestStatus(admin, request.id, {
      status: 'confirmed',
      confirmed_by: party.authUserId,
      confirmed_at: new Date().toISOString(),
      fee_action: REINSTATE_FEE_FREE_FLAGGED,
    })
    return {
      ok: true,
      alreadyReinstated: true,
      request: confirmed ?? request,
      bookingStatusAfter: booking.status,
      signing_needs_resend: false,
      signing_resend_failed: false,
      fee_action: REINSTATE_FEE_FREE_FLAGGED,
      listing_fee_refunded: false,
    }
  }

  const feeParsed = parseOptionalFeeAction(args.feeAction)
  if (!feeParsed.ok) return feeParsed

  let feeAction: ReinstatementFeeAction = REINSTATE_FEE_FREE_FLAGGED
  if (request.requested_by_role === 'landlord' && request.requested_fee_action) {
    if (!validateV1FeeAction(request.requested_fee_action)) {
      return {
        ok: false,
        status: 400,
        error: 'Invalid requested fee action.',
        code: 'invalid_fee_action',
        request,
      }
    }
    feeAction = request.requested_fee_action
  } else if (party.role === 'landlord') {
    feeAction = feeParsed.value ?? REINSTATE_FEE_FREE_FLAGGED
  }

  const avail = await isPropertyBlockedForReinstatement(admin, {
    propertyId: booking.property_id,
    moveInDate: booking.move_in_date,
    startDate: booking.start_date,
    endDate: booking.end_date,
    excludeStudentId: booking.student_id,
  })
  if (avail.blocked) {
    const blocked = await markRequestStatus(admin, request.id, {
      status: 'blocked_unavailable',
      metadata: {
        ...(request.metadata && typeof request.metadata === 'object' ? request.metadata : {}),
        blocked_reason: avail.error || 'property_unavailable',
      },
    })
    void sendReinstatementBlockedUnavailableEmails(admin, booking.id)
    return {
      ok: false,
      status: 409,
      error: 'The room was taken while this reinstatement was pending.',
      code: 'blocked_unavailable',
      request: blocked ?? request,
    }
  }

  const refundMarker = await findBondPendingExpiredRefundMarker(admin, booking.id)

  const { tenancy, doc } = await loadLatestLeaseDocForBooking(admin, booking.id)
  let signingNeedsResend = false
  let signingResendFailed = false
  let submissionCompleted = false

  if (doc?.docuseal_submission_id) {
    try {
      const submissionPayload = await fetchDocusealSubmission(doc.docuseal_submission_id.trim())
      const signingPkg = parseSigningPackage(doc.metadata)
      const isResidentialTenancyPackage =
        signingPkg === 'residential_tenancy' ||
        signingPkg === 'residential_tenancy_qld' ||
        signingPkg === 'residential_tenancy_vic'
      const coTenantRequired = doc.tenancy_id
        ? await isCoTenantRequiredForTenancy(admin, doc.tenancy_id, isResidentialTenancyPackage)
        : false
      submissionCompleted = isSubmissionFullySignedOnDocuseal(submissionPayload, coTenantRequired)

      if (submissionCompleted) {
        await syncFullySignedDocusealSubmission({
          admin,
          docRow: doc,
          submissionId: doc.docuseal_submission_id.trim(),
          submissionPayload,
          metadataExtra: {
            reinstated_self_serve: {
              request_id: request.id,
              confirmed_by: party.authUserId,
              at: new Date().toISOString(),
            },
          },
          eventOptions: {
            source: 'reconcile',
            actorType: party.role === 'landlord' ? 'landlord' : 'student',
            actorId: party.authUserId,
            ensureMissing: true,
          },
        })
      }
    } catch (syncErr) {
      console.error('[confirmReinstatement] docuseal sync', booking.id, syncErr)
      // If remote submission is gone/archived, treat as unsigned path
      submissionCompleted = false
    }
  }

  const reinstateResult = await reinstateBookingAfterDocusealReconcile({
    admin,
    booking: {
      id: booking.id,
      status: booking.status,
      bond_received_by_landlord_at: booking.bond_received_by_landlord_at,
      service_tier_final: booking.service_tier_final,
      listing_agreement_status: booking.listing_agreement_status,
      property_id: booking.property_id,
      landlord_id: booking.landlord_id,
      student_id: booking.student_id,
      expired_at: booking.expired_at,
    },
    tenancy,
  })

  if (!submissionCompleted) {
    signingNeedsResend = true
    try {
      const reset = await resetTenancyDocumentForNewSigningRound(admin, booking.id)
      if (!reset.ok) {
        signingResendFailed = true
      } else {
        const gen = await triggerListingDocumentGeneration({
          admin,
          bookingId: booking.id,
          deferSigning: false,
        })
        if (!gen.ok || gen.skipped) {
          signingResendFailed = true
        }
      }
    } catch (regenErr) {
      console.error('[confirmReinstatement] regenerate', booking.id, regenErr)
      signingResendFailed = true
    }
  }

  const nowIso = new Date().toISOString()
  const confirmed = await markRequestStatus(admin, request.id, {
    status: 'confirmed',
    confirmed_by: party.authUserId,
    confirmed_at: nowIso,
    fee_action: feeAction,
    metadata: {
      ...(request.metadata && typeof request.metadata === 'object' ? request.metadata : {}),
      listing_fee_refunded: refundMarker.found,
      refund_marker: refundMarker.metadata,
      signing_needs_resend: signingNeedsResend,
      signing_resend_failed: signingResendFailed,
    },
  })

  try {
    await recordBookingEvent(admin, {
      bookingId: booking.id,
      landlordId: booking.landlord_id,
      studentId: booking.student_id,
      eventType: 'booking.reinstated_self_serve',
      actorType: party.role === 'landlord' ? 'landlord' : 'student',
      actorId: party.authUserId,
      audience: 'both',
      outcome: 'success',
      metadata: {
        request_id: request.id,
        fee_action: feeAction,
        listing_fee_refunded: refundMarker.found,
        refund_marker: refundMarker.metadata,
        signing_needs_resend: signingNeedsResend,
        signing_resend_failed: signingResendFailed,
        booking_status_before: reinstateResult.bookingStatusBefore,
        booking_status_after: reinstateResult.bookingStatusAfter,
        requested_by: request.requested_by,
        confirmed_by: party.authUserId,
        changes: reinstateResult.changes,
      },
    })
  } catch (evErr) {
    console.error('[confirmReinstatement] audit event', evErr)
  }

  void sendReinstatementConfirmedEmails(admin, booking.id, {
    signingResent: signingNeedsResend && !signingResendFailed,
    signingResendFailed,
    listingFeeRefunded: refundMarker.found,
    bookingStatusAfter: reinstateResult.bookingStatusAfter,
  })

  return {
    ok: true,
    request: confirmed ?? { ...request, status: 'confirmed', fee_action: feeAction },
    bookingStatusAfter: reinstateResult.bookingStatusAfter,
    signing_needs_resend: signingNeedsResend,
    signing_resend_failed: signingResendFailed,
    fee_action: feeAction,
    listing_fee_refunded: refundMarker.found,
  }
}
