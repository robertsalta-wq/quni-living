import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { sendListingBondPendingExpiredEmails } from './listingTransactionalEmails.js'
import { runUnwindListingAgreementCleanup } from './unwindListingAgreement.js'
import { guardBondExpiryForSignedLease } from './guardSignedLeaseExpiry.js'

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
  | { ok: true; expired: false; blocked: 'signed_lease' }
  | { ok: false; retry: true }

/**
 * Expire one Listing `bond_pending` booking past its bond window.
 * No cash refund of a lease fee. The lease fee is charged at signing, not at accept.
 */
export async function runExpireListingBondPendingBooking(args: {
  stripe: Stripe
  admin: SupabaseClient
  booking: ExpireListingBondPendingRow
  nowIso: string
}): Promise<ExpireListingBondPendingResult> {
  const { admin, booking, nowIso } = args
  void args.stripe
  const bookingId = booking.id

  // Never expire a booking whose lease is already fully signed (missed
  // DocuSeal completion webhook). Blocks before any refund/mutation.
  const signedGuard = await guardBondExpiryForSignedLease({ admin, booking, nowIso })
  if (signedGuard.blocked) {
    return { ok: true, expired: false, blocked: 'signed_lease' }
  }

  const refundId: string | null = null
  const refundAmountCents: number | null = null

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
  }

  try {
    const { recordBookingEvent } = await import('./events/recordBookingEvent.js')
    await recordBookingEvent(admin, {
      bookingId,
      landlordId: booking.landlord_id,
      studentId: booking.student_id,
      eventType: 'bond.pending_expired',
      actorType: 'cron',
      provider: null,
      providerRef: null,
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
