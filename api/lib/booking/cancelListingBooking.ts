import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import {
  fetchListingFeePaymentIntentId,
  refundListingFeePaymentIntentFull,
} from './listingFeePaymentIntent.js'
import { sendListingCancelledByLandlordEmails } from './listingTransactionalEmails.js'
import { runUnwindListingAgreementCleanup } from './unwindListingAgreement.js'

export type CancelListingBookingResult =
  | { ok: true; idempotent: true; bookingId: string; status: 'cancelled' }
  | {
      ok: true
      idempotent: false
      bookingId: string
      status: 'cancelled'
      refundId: string | null
      refundAmountCents: number | null
    }
  | { ok: false; status: number; code: string; message: string }

/**
 * Landlord cancels a Listing booking while `bond_pending`.
 * Refunds the Listing fee when a PI exists; fee-exempt accepts (no PI) skip refund.
 */
export async function runCancelListingBookingLandlord(args: {
  stripe: Stripe
  admin: SupabaseClient
  landlordProfileId: string
  bookingId: string
  cancellationReason?: string | null
}): Promise<CancelListingBookingResult> {
  const { stripe, admin, landlordProfileId, bookingId, cancellationReason } = args

  const { data: booking, error: loadErr } = await admin
    .from('bookings')
    .select('id, landlord_id, student_id, property_id, status, service_tier_final')
    .eq('id', bookingId)
    .maybeSingle()

  if (loadErr) {
    console.error('[cancel-listing] load booking', loadErr)
    return { ok: false, status: 500, code: 'db_error', message: 'Could not load booking.' }
  }
  if (!booking) {
    return { ok: false, status: 404, code: 'not_found', message: 'Booking not found.' }
  }

  if (booking.landlord_id !== landlordProfileId) {
    return { ok: false, status: 403, code: 'forbidden', message: 'Forbidden.' }
  }

  if (booking.status === 'cancelled') {
    return { ok: true, idempotent: true, bookingId: booking.id, status: 'cancelled' }
  }

  if (booking.service_tier_final !== 'listing') {
    return {
      ok: false,
      status: 400,
      code: 'wrong_tier',
      message: 'Only Listing bookings can be cancelled this way.',
    }
  }

  if (booking.status !== 'bond_pending') {
    return {
      ok: false,
      status: 400,
      code: 'invalid_status',
      message: 'This booking can only be cancelled while bond is still pending.',
    }
  }

  const piId = await fetchListingFeePaymentIntentId(admin, bookingId)

  let refundId: string | null = null
  let refundAmountCents: number | null = null
  if (piId) {
    try {
      const r = await refundListingFeePaymentIntentFull(
        stripe,
        piId,
        `listing-cancel-${bookingId}`,
      )
      refundId = r.refundId
      refundAmountCents = r.refundAmountCents ?? 9900
    } catch (e) {
      console.error('[cancel-listing] stripe refund', bookingId, e)
      return {
        ok: false,
        status: 502,
        code: 'refund_failed',
        message: 'Refund could not be processed. Try again or contact support.',
      }
    }
  } else {
    console.warn('[cancel-listing] no listing fee PI; skipping refund', { bookingId })
  }

  const nowIso = new Date().toISOString()
  const reasonTrim =
    typeof cancellationReason === 'string' ? cancellationReason.trim().slice(0, 2000) : ''

  const { data: updatedRows, error: upErr } = await admin
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: nowIso,
      cancelled_by: 'landlord',
      cancellation_reason: reasonTrim || null,
    })
    .eq('id', bookingId)
    .eq('status', 'bond_pending')
    .select('id, status')

  if (upErr) {
    console.error('[cancel-listing] booking update after cancel', upErr, { bookingId })
    return {
      ok: false,
      status: 500,
      code: 'state_out_of_sync',
      message: piId
        ? 'Refund may have succeeded but we could not update the booking. Contact support.'
        : 'Could not update the booking. Try again or contact support.',
    }
  }

  const updated = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows
  if (!updated) {
    const { data: again } = await admin
      .from('bookings')
      .select('id, status')
      .eq('id', bookingId)
      .maybeSingle()
    if (again?.status === 'cancelled') {
      await runUnwindListingAgreementCleanup(admin, {
        bookingId,
        propertyId: booking.property_id,
        landlordId: booking.landlord_id,
        studentId: booking.student_id,
        serviceTier: booking.service_tier_final,
        unwindReason: 'cancelled',
      })
      return { ok: true, idempotent: true, bookingId, status: 'cancelled' }
    }
    return {
      ok: false,
      status: 409,
      code: 'concurrent_update',
      message: 'Booking state changed. Refresh and try again.',
    }
  }

  const metaPayload = {
    ...(refundId != null ? { refund_id: refundId } : {}),
    ...(refundAmountCents != null ? { refund_amount_cents: refundAmountCents } : { fee_exempt: true }),
    reason: reasonTrim || undefined,
    ...(piId ? { stripe_payment_intent_id: piId } : {}),
  }

  try {
    const { recordBookingEvent } = await import('./events/recordBookingEvent.js')
    await recordBookingEvent(admin, {
      bookingId,
      landlordId: booking.landlord_id,
      studentId: booking.student_id,
      eventType: 'bond.pending_cancelled_by_landlord',
      actorType: 'landlord',
      reason: reasonTrim || null,
      provider: piId ? 'stripe' : null,
      providerRef: piId || null,
      metadata: {
        ...metaPayload,
        service_tier: 'listing',
      },
    })
  } catch (evErr) {
    console.error('[cancel-listing] bond.pending_cancelled_by_landlord event', evErr)
  }

  try {
    await sendListingCancelledByLandlordEmails(admin, bookingId, {
      cancellation_reason: reasonTrim || null,
    })
  } catch (e) {
    console.error('[cancel-listing] cancellation emails', bookingId, e)
  }

  await runUnwindListingAgreementCleanup(admin, {
    bookingId,
    propertyId: booking.property_id,
    landlordId: booking.landlord_id,
    studentId: booking.student_id,
    serviceTier: booking.service_tier_final,
    unwindReason: 'cancelled',
  })

  return {
    ok: true,
    idempotent: false,
    bookingId,
    status: 'cancelled',
    refundId,
    refundAmountCents,
  }
}
