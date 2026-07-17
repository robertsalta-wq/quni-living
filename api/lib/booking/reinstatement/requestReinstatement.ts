import type { SupabaseClient } from '@supabase/supabase-js'
import { recordBookingEvent } from '../events/recordBookingEvent.js'
import {
  graceWindowExpiresAt,
  REINSTATE_FEE_FREE_FLAGGED,
  type ReinstatementFeeAction,
} from './constants.js'
import type { PartyOfBooking } from './assertPartyOfBooking.js'
import { assertReinstatementRequestEligibility, parseOptionalFeeAction } from './eligibility.js'
import {
  lazyExpireReinstatementRequest,
  loadPendingReinstatementRequest,
  type ReinstatementRequestRow,
} from './requestRows.js'
import { sendReinstatementRequestEmails } from './emails.js'

export type RequestReinstatementResult =
  | {
      ok: true
      request: ReinstatementRequestRow
      otherPartyRole: 'landlord' | 'tenant'
    }
  | { ok: false; status: number; error: string; code?: string }

export async function requestReinstatement(args: {
  admin: SupabaseClient
  party: PartyOfBooking
  feeAction?: unknown
}): Promise<RequestReinstatementResult> {
  const { admin, party } = args
  const booking = party.booking

  const elig = assertReinstatementRequestEligibility(booking)
  if (!elig.ok) return elig

  const feeParsed = parseOptionalFeeAction(args.feeAction)
  if (!feeParsed.ok) return feeParsed

  const pending = await loadPendingReinstatementRequest(admin, booking.id)
  if (pending) {
    const maybeExpired = await lazyExpireReinstatementRequest(admin, pending)
    if (maybeExpired.status === 'pending_confirmation') {
      return {
        ok: false,
        status: 409,
        error: 'A reinstatement request is already pending confirmation.',
        code: 'pending_exists',
      }
    }
  }

  const feeAction: ReinstatementFeeAction | null =
    party.role === 'landlord'
      ? feeParsed.value ?? REINSTATE_FEE_FREE_FLAGGED
      : null

  const nowIso = new Date().toISOString()
  const insert = {
    booking_id: booking.id,
    requested_by: party.authUserId,
    requested_by_role: party.role,
    requested_at: nowIso,
    grace_window_expires_at: graceWindowExpiresAt(booking.expired_at!),
    status: 'pending_confirmation' as const,
    requested_fee_action: feeAction,
    metadata: {},
    updated_at: nowIso,
  }

  const { data, error } = await admin
    .from('booking_reinstatement_requests')
    .insert(insert)
    .select(
      'id, booking_id, requested_by, requested_by_role, requested_at, grace_window_expires_at, status, requested_fee_action, confirmed_by, confirmed_at, fee_action, metadata, created_at, updated_at',
    )
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      return {
        ok: false,
        status: 409,
        error: 'A reinstatement request is already pending confirmation.',
        code: 'pending_exists',
      }
    }
    console.error('[requestReinstatement] insert', error.message)
    return { ok: false, status: 500, error: 'Could not create reinstatement request' }
  }

  const request = data as ReinstatementRequestRow
  const otherPartyRole = party.role === 'landlord' ? 'tenant' : 'landlord'

  try {
    await recordBookingEvent(admin, {
      bookingId: booking.id,
      landlordId: booking.landlord_id,
      studentId: booking.student_id,
      eventType: 'booking.reinstatement_requested',
      actorType: party.role === 'landlord' ? 'landlord' : 'student',
      actorId: party.authUserId,
      audience: 'both',
      outcome: 'pending',
      metadata: {
        request_id: request.id,
        requested_by_role: party.role,
        requested_fee_action: feeAction,
        grace_window_expires_at: request.grace_window_expires_at,
      },
    })
  } catch (evErr) {
    console.error('[requestReinstatement] event', evErr)
  }

  void sendReinstatementRequestEmails(admin, booking.id, {
    requesterRole: party.role,
    otherPartyRole,
    graceWindowExpiresAt: request.grace_window_expires_at,
  })

  return { ok: true, request, otherPartyRole }
}
