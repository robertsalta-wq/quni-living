// @ts-nocheck — Listing-tier confirm: cancel renter hold + $99 landlord charge + bond_pending.

import { sendListingBookingAcceptedEmails } from './listingTransactionalEmails.js'
import { triggerListingDocumentGeneration } from './triggerListingDocumentGeneration.js'

const LISTING_FEE_CENTS = 9900
const LISTING_PRODUCT_ID = 'prod_UTXU1Ilz3bfCY7'

function jsonFail(status, body) {
  return { ok: false, status, body }
}

function cancellationTolerated(err) {
  const msg = err && typeof err === 'object' && 'message' in err ? String(err.message).toLowerCase() : ''
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
  return (
    code === 'payment_intent_unexpected_state' ||
    msg.includes('cannot cancel') ||
    msg.includes('already been canceled') ||
    msg.includes('already cancelled') ||
    msg.includes('has already been canceled') ||
    msg.includes('has succeeded') ||
    msg.includes('cannot be canceled')
  )
}

/**
 * @param {object} params
 * @param {import('stripe').default} params.stripe
 * @param {import('@supabase/supabase-js').SupabaseClient} params.admin
 * @param {{ id: string; stripe_customer_id?: string | null }} params.landlord
 * @param {string} params.bookingId
 */
export async function runListingConfirmBooking(params) {
  const { stripe, admin, landlord, bookingId, origin: _origin } = params

  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(
      `
      id,
      landlord_id,
      student_id,
      property_id,
      status,
      stripe_payment_intent_id,
      service_tier_at_request
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (bErr || !booking) {
    return jsonFail(404, { error: 'Booking not found' })
  }

  if (booking.landlord_id !== landlord.id) {
    return jsonFail(403, { error: 'Forbidden' })
  }

  const confirmableListing =
    booking.status === 'pending_confirmation' || booking.status === 'awaiting_info'
  if (!confirmableListing) {
    return jsonFail(400, {
      error: 'invalid_status',
      message: 'Listing confirmation requires status pending_confirmation or awaiting_info.',
    })
  }

  const customerId = typeof landlord.stripe_customer_id === 'string' ? landlord.stripe_customer_id.trim() : ''
  if (!customerId) {
    return jsonFail(400, {
      error: 'listing_billing_incomplete',
      message: 'Add a saved card for Listing billing before confirming.',
    })
  }

  let customer
  try {
    customer = await stripe.customers.retrieve(customerId, {
      expand: ['invoice_settings.default_payment_method'],
    })
  } catch (e) {
    console.error('[confirm-listing] retrieve customer', e)
    return jsonFail(400, {
      error: 'listing_billing_incomplete',
      message: 'Could not load your billing profile.',
    })
  }

  if (customer.deleted) {
    return jsonFail(400, {
      error: 'listing_billing_incomplete',
      message: 'Billing customer record is invalid.',
    })
  }

  const pm = customer.invoice_settings?.default_payment_method
  let defaultPaymentMethodId = null
  if (typeof pm === 'string') defaultPaymentMethodId = pm
  else if (pm && typeof pm === 'object' && 'id' in pm && typeof pm.id === 'string') defaultPaymentMethodId = pm.id

  if (!defaultPaymentMethodId) {
    return jsonFail(400, {
      error: 'listing_billing_incomplete',
      message: 'Set a default payment method for Listing billing before confirming.',
    })
  }

  const piHold =
    typeof booking.stripe_payment_intent_id === 'string' ? booking.stripe_payment_intent_id.trim() : ''
  if (piHold) {
    try {
      await stripe.paymentIntents.cancel(piHold)
    } catch (e) {
      if (cancellationTolerated(e)) {
        console.warn('[confirm-listing] deposit PI cancel tolerated', { piHold, err: String(e?.message || e) })
      } else {
        console.error('[confirm-listing] deposit PI cancel failed', e)
      }
    }
  }

  const idempotencyKey = `confirm-listing-${booking.id}`

  let chargePi
  try {
    chargePi = await stripe.paymentIntents.create(
      {
        amount: LISTING_FEE_CENTS,
        currency: 'aud',
        customer: customerId,
        payment_method: defaultPaymentMethodId,
        off_session: true,
        confirm: true,
        description: `Quni Listing fee — booking ${booking.id.slice(0, 8)}`,
        metadata: {
          booking_id: booking.id,
          property_id: booking.property_id ?? '',
          landlord_id: landlord.id,
          service_tier: 'listing',
          stripe_product_id: LISTING_PRODUCT_ID,
        },
      },
      { idempotencyKey },
    )
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : ''
    const raw = e && typeof e === 'object' && 'raw' in e && e.raw && typeof e.raw === 'object' ? e.raw : null
    const piFromErr =
      e && typeof e === 'object' && 'payment_intent' in e ? e.payment_intent : null
    const piFromRaw =
      raw && 'payment_intent' in raw && raw.payment_intent && typeof raw.payment_intent === 'object'
        ? raw.payment_intent
        : null
    const paymentIntent =
      piFromErr && typeof piFromErr === 'object' ? piFromErr : piFromRaw

    if (code === 'authentication_required' && paymentIntent?.client_secret && paymentIntent?.id) {
      return {
        ok: false,
        status: 402,
        body: {
          error: 'requires_action',
          requires_action: true,
          payment_intent_id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
        },
      }
    }

    const declineCode =
      e && typeof e === 'object' && 'decline_code' in e ? String(e.decline_code || '') : ''
    const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : 'Payment failed'

    return jsonFail(402, {
      error: 'charge_failed',
      message: msg.slice(0, 500),
      decline_code: declineCode || undefined,
      code: code || undefined,
    })
  }

  if (chargePi.status === 'requires_action' && chargePi.client_secret) {
    return {
      ok: false,
      status: 402,
      body: {
        error: 'requires_action',
        requires_action: true,
        payment_intent_id: chargePi.id,
        client_secret: chargePi.client_secret,
      },
    }
  }

  if (chargePi.status !== 'succeeded') {
    return jsonFail(402, {
      error: 'charge_incomplete',
      message: `Charge did not succeed (status: ${chargePi.status}).`,
      payment_intent_status: chargePi.status,
    })
  }

  const nowIso = new Date().toISOString()
  const bondWindow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: updatedRows, error: upErr } = await admin
    .from('bookings')
    .update({
      status: 'bond_pending',
      service_tier_final: 'listing',
      bond_window_expires_at: bondWindow,
      confirmed_at: nowIso,
      listing_fee_stripe_payment_intent_id: chargePi.id,
    })
    .eq('id', booking.id)
    .eq('status', 'pending_confirmation')
    .select('id, status, bond_window_expires_at, service_tier_final, confirmed_at')

  if (upErr) {
    console.error('[confirm-listing] booking update', upErr)
    return jsonFail(500, { error: 'Could not update booking after charge' })
  }

  const updated = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows

  if (!updated) {
    const { data: again } = await admin
      .from('bookings')
      .select('id, status, bond_window_expires_at, service_tier_final, stripe_payment_intent_id')
      .eq('id', booking.id)
      .maybeSingle()
    if (again?.status === 'bond_pending') {
      return {
        ok: true,
        idempotent: true,
        status: 'bond_pending',
        bond_window_expires_at: again.bond_window_expires_at,
        service_tier_final: 'listing',
      }
    }
    return jsonFail(409, {
      error: 'concurrent_confirm',
      message: 'Booking state changed during confirmation. Retry or refresh.',
    })
  }

  const { error: evErr } = await admin.from('service_tier_events').insert({
    booking_id: booking.id,
    property_id: booking.property_id,
    landlord_id: booking.landlord_id,
    student_id: booking.student_id,
    event_type: 'booking_confirmed',
    service_tier: 'listing',
    metadata: {
      stripe_payment_intent_id: chargePi.id,
      amount_cents: LISTING_FEE_CENTS,
      bond_window_expires_at: bondWindow,
    },
  })

  if (evErr) {
    console.error('[confirm-listing] service_tier_events insert', evErr)
  }

  if (updated) {
    try {
      await sendListingBookingAcceptedEmails(admin, booking.id, {
        bond_window_expires_at: bondWindow,
      })
    } catch (e) {
      console.error('[confirm-listing] acceptance emails', e)
    }

    /**
     * Phase 3 / Task J: generate the lease as a preview-only document at landlord-confirm.
     * DocuSeal signing flow is deferred until the landlord ticks "Bond received".
     * Failures are non-fatal — booking is already in `bond_pending` and the lease can be
     * regenerated when the bond-received action runs.
     */
    try {
      await triggerListingDocumentGeneration({
        admin,
        bookingId: booking.id,
        deferSigning: true,
      })
    } catch (e) {
      console.error('[confirm-listing] preview document generation', e)
    }
  }

  return {
    ok: true,
    idempotent: false,
    status: 'bond_pending',
    bond_window_expires_at: bondWindow,
    service_tier_final: 'listing',
    listing_fee_payment_intent_id: chargePi.id,
  }
}
