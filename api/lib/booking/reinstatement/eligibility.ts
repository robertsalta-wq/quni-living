import { isWithdrawnBookingStatus } from '../../docuseal/reconcileFromDocuseal.js'
import {
  isWithinReinstatementGrace,
  type ReinstatementFeeAction,
  validateV1FeeAction,
} from './constants.js'
import type { PartyOfBooking } from './assertPartyOfBooking.js'

export type EligibilityFail = { ok: false; status: number; error: string; code: string }
export type EligibilityOk = { ok: true }

export function assertReinstatementRequestEligibility(
  booking: PartyOfBooking['booking'],
): EligibilityOk | EligibilityFail {
  if (isWithdrawnBookingStatus(booking.status)) {
    return {
      ok: false,
      status: 409,
      error: 'Withdrawn bookings cannot be reinstated.',
      code: 'withdrawn',
    }
  }
  if (booking.status !== 'expired') {
    return {
      ok: false,
      status: 409,
      error: 'Only expired bookings can be reinstated.',
      code: 'not_expired',
    }
  }
  if (!booking.expired_at) {
    return {
      ok: false,
      status: 409,
      error: 'Booking has no expired_at timestamp.',
      code: 'missing_expired_at',
    }
  }
  if (booking.service_tier_final !== 'listing') {
    return {
      ok: false,
      status: 409,
      error: 'Self-serve reinstatement applies only to Listing bookings.',
      code: 'not_listing',
    }
  }
  if (!isWithinReinstatementGrace(booking.expired_at)) {
    return {
      ok: false,
      status: 409,
      error: 'The self-serve reinstatement window has closed. Contact support.',
      code: 'grace_elapsed',
    }
  }
  return { ok: true }
}

export function parseOptionalFeeAction(
  feeAction: unknown,
): { ok: true; value: ReinstatementFeeAction | null } | EligibilityFail {
  if (feeAction === undefined || feeAction === null || feeAction === '') {
    return { ok: true, value: null }
  }
  if (!validateV1FeeAction(feeAction)) {
    return {
      ok: false,
      status: 400,
      error: 'feeAction must be reinstate_free_flagged in v1.',
      code: 'invalid_fee_action',
    }
  }
  return { ok: true, value: feeAction }
}
