import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import {
  fetchListingFeePaymentIntentId,
  refundListingFeePaymentIntentFull,
} from './listingFeePaymentIntent.js'
import { sendListingBondPendingExpiredEmails } from './listingTransactionalEmails.js'
import { runUnwindListingAgreementCleanup } from './unwindListingAgreement.js'

/** Row shape from expire-bookings bond_pending select (includes email joins). */
export type ExpireListingBondPendingRow = {
  id: string
  landlord_id: string | null
  student_id: string | null
  property_id: string | null
  student_profiles?: unknown
  landlord_profiles?: unknown
  properties?: unknown
}

export type ExpireListingBondPendingResult =
  | { ok: true; expired: true }
  | { ok: false; retry: true }

/**
 * Expire one Listing `bond_pending` booking past its bond window.
 * Refunds the Listing fee when a PI exists; fee-exempt accepts (no PI) skip refund.
 */
export async function runExpireListingBondPendingBooking(args: {
  stripe: Stripe
  admin: SupabaseClient
  booking: ExpireListingBondPendingRow
  nowIso: string
}): Promise<ExpireListingBondPendingResult> {
  const { stripe, admin, booking, nowIso } = args
  const bookingId = booking.id

  const piId = await fetchListingFeePaymentIntentId(admin, bookingId)

  let refundId: string | null = null
  let refundAmountCents: number | null = null

  if (piId) {
    try {
      const r = await refundListingFeePaymentIntentFull(
        stripe,
        piId,
        `listing-expire-${bookingId}`,
      )
      refundId = r.refundId
      refundAmountCents =
        typeof r.refundAmountCents === 'number' && Number.isFinite(r.refundAmountCents)
          ? r.refundAmountCents
          : 9900
    } catch (re) {
      console.error('expire-bookings bond refund', bookingId, re)
      return { ok: false, retry: true }
    }
  } else {
    console.warn('[expire-listing-bond] no listing fee PI; skipping refund', { bookingId })
  }

  const { error: upBondErr } = await admin
    .from('bookings')
    .update({ status: 'expired', expired_at: nowIso })
    .eq('id', bookingId)
    .eq('status', 'bond_pending')

  if (upBondErr) {
    console.error('expire-bookings bond_pending update', bookingId, upBondErr)
    return { ok: false, retry: true }
  }

  const metadata = {
    reason: 'bond_window_elapsed',
    ...(refundId != null ? { refund_id: refundId } : {}),
    ...(refundAmountCents != null
      ? { refund_amount_cents: refundAmountCents }
      : { fee_exempt: true }),
    ...(piId ? { stripe_payment_intent_id: piId } : {}),
  }

  try {
    const { recordBookingEvent } = await import('./events/recordBookingEvent.js')
    await recordBookingEvent(admin, {
      bookingId,
      landlordId: booking.landlord_id,
      studentId: booking.student_id,
      eventType: 'bond.pending_expired',
      actorType: 'cron',
      provider: piId ? 'stripe' : null,
      providerRef: piId || null,
      metadata: {
        ...metadata,
        service_tier: 'listing',
      },
    })
  } catch (evErr) {
    console.error('expire-bookings bond.pending_expired event', bookingId, evErr)
  }

  try {
    await sendListingBondPendingExpiredEmails(admin, booking, {
      refund_id: refundId,
      refund_amount_cents: refundAmountCents,
    })
  } catch (emErr) {
    console.error('expire-bookings bond_pending email', bookingId, emErr)
  }

  await runUnwindListingAgreementCleanup(admin, {
    bookingId,
    propertyId: booking.property_id,
    landlordId: booking.landlord_id,
    studentId: booking.student_id,
    serviceTier: 'listing',
    unwindReason: 'expired',
  })

  return { ok: true, expired: true }
}
