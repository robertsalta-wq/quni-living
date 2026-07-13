import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../src/lib/database.types.js'
import {
  sendListingAgreementReadyEmails,
  sendListingBookingAcceptedEmails,
} from './listingTransactionalEmails.js'
import { triggerListingDocumentGeneration } from './triggerListingDocumentGeneration.js'
import { unlockConversationOnBookingConfirmed } from '../messaging/bookingConversation.js'
import {
  isLandlordFeeExempt,
  resolveListingPlatformFeeCents,
} from '../pricing/resolvePlatformFee.js'
import { landlordHostIdentityReadyForConfirm } from '../landlordVerifiedSync.js'
import { preflightListingTenancyDocument } from '../documents/listingTenancyGeneration/index.js'
import { TENANT_LEGAL_NAME_NOT_READY_CODE } from './assertStudentLegalNameForSigning.js'
import { setListingAgreementStatus } from './listingAgreementStatus.js'
import { bookingUsesOccupancyAgreement } from '../resolveTenancyPackage.js'
import { propertyPayoutDetailsComplete } from '../../../src/lib/propertyPayoutDetails.js'

const LISTING_FEE_CENTS = 9900
const LISTING_PRODUCT_ID =
  (typeof process !== 'undefined' && process.env?.STRIPE_LISTING_PRODUCT_ID?.trim()) ||
  'prod_UTXU1Ilz3bfCY7'

type ConfirmFail = { ok: false; status: number; body: Record<string, unknown> }
type ConfirmOk = {
  ok: true
  idempotent: boolean
  status: 'bond_pending'
  bond_window_expires_at: string
  service_tier_final: 'listing'
  listing_fee_payment_intent_id?: string | null
  listing_agreement_status?: 'pending' | 'ready' | 'failed' | 'voided' | null
}

function jsonFail(status: number, body: Record<string, unknown>): ConfirmFail {
  return { ok: false, status, body }
}

function cancellationTolerated(err: unknown): boolean {
  const msg =
    err && typeof err === 'object' && 'message' in err ? String(err.message).toLowerCase() : ''
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

function docGenSucceededForSigning(
  gen: Awaited<ReturnType<typeof triggerListingDocumentGeneration>>,
): boolean {
  if (!gen.ok || gen.skipped) return false
  return Boolean(gen.docusealSubmissionId) || Boolean(gen.documentId)
}

export type RunListingConfirmBookingParams = {
  stripe: Stripe
  admin: SupabaseClient<Database>
  landlord: {
    id: string
    stripe_customer_id?: string | null
    user_id?: string | null
    stripe_charges_enabled?: boolean | null
    admin_override_verified?: boolean | null
  }
  bookingId: string
  origin?: string
  deviceCtx?: { user_agent: string; is_mobile: boolean } | null
}

export async function runListingConfirmBooking(
  params: RunListingConfirmBookingParams,
): Promise<ConfirmFail | ConfirmOk> {
  const { stripe, admin, landlord, bookingId, deviceCtx = null } = params
  const landlordUserId =
    typeof landlord.user_id === 'string' && landlord.user_id.trim() ? landlord.user_id.trim() : null

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
      service_tier_at_request,
      move_in_date,
      start_date,
      properties ( state, property_type, is_registered_rooming_house )
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

  if (!landlordHostIdentityReadyForConfirm(landlord, { tier: 'listing' })) {
    return jsonFail(400, {
      error: 'host_identity_not_ready',
      message: 'Complete Stripe identity verification before accepting bookings.',
    })
  }

  const prop =
    booking.properties && typeof booking.properties === 'object' && !Array.isArray(booking.properties)
      ? booking.properties
      : null
  if (bookingUsesOccupancyAgreement(booking, prop)) {
    const propertyId =
      typeof booking.property_id === 'string' && booking.property_id.trim() ? booking.property_id.trim() : ''
    if (!propertyId) {
      return jsonFail(400, {
        error: 'listing_payout_details_missing',
        message: 'Add payout bank details for this property before accepting.',
      })
    }
    const { data: payoutRow, error: payoutErr } = await admin
      .from('property_payout_details')
      .select('account_name, bsb, account_number')
      .eq('property_id', propertyId)
      .maybeSingle()
    if (payoutErr) {
      console.error('[confirm-listing] load payout details', payoutErr)
      return jsonFail(503, {
        error: 'listing_payout_details_unavailable',
        message: 'Could not verify payout bank details. Try again shortly.',
      })
    }
    if (!propertyPayoutDetailsComplete(payoutRow)) {
      return jsonFail(400, {
        error: 'listing_payout_details_missing',
        message: 'Add payout bank details for this property before accepting.',
      })
    }
  }

  const preflight = await preflightListingTenancyDocument(admin, booking.id)
  if (!preflight.ok) {
    const legalNameGate = preflight.error === TENANT_LEGAL_NAME_NOT_READY_CODE
    return jsonFail(preflight.status >= 500 ? 503 : preflight.status, {
      error: legalNameGate ? TENANT_LEGAL_NAME_NOT_READY_CODE : 'agreement_preflight_failed',
      message: legalNameGate
        ? 'Tenant legal name must be verified and locked before signing.'
        : preflight.error ||
          'We could not prepare your tenancy agreement. Fix the issue below and try again.',
      detail: preflight.detail,
    })
  }

  const feeExempt = await isLandlordFeeExempt(admin, landlord.id)
  const listingFeeCents = resolveListingPlatformFeeCents(feeExempt, LISTING_FEE_CENTS)

  // Legacy Listing applies may still have a deposit hold until this cancel runs; new applies have no PI.
  const piHold =
    typeof booking.stripe_payment_intent_id === 'string' ? booking.stripe_payment_intent_id.trim() : ''
  if (piHold) {
    try {
      await stripe.paymentIntents.cancel(piHold)
    } catch (e) {
      if (cancellationTolerated(e)) {
        console.warn('[confirm-listing] deposit PI cancel tolerated', { piHold, err: String((e as Error)?.message || e) })
      } else {
        console.error('[confirm-listing] deposit PI cancel failed', e)
      }
    }
  }

  const idempotencyKey = `confirm-listing-${booking.id}`

  let chargePi: Stripe.PaymentIntent | null = null
  if (listingFeeCents > 0) {
    const customerId = typeof landlord.stripe_customer_id === 'string' ? landlord.stripe_customer_id.trim() : ''
    if (!customerId) {
      return jsonFail(400, {
        error: 'listing_billing_incomplete',
        message: 'Add a saved card for Listing billing before confirming.',
      })
    }

    let customer: Stripe.Customer | Stripe.DeletedCustomer
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
    let defaultPaymentMethodId: string | null = null
    if (typeof pm === 'string') defaultPaymentMethodId = pm
    else if (pm && typeof pm === 'object' && 'id' in pm && typeof pm.id === 'string')
      defaultPaymentMethodId = pm.id

    if (!defaultPaymentMethodId) {
      return jsonFail(400, {
        error: 'listing_billing_incomplete',
        message: 'Set a default payment method for Listing billing before confirming.',
      })
    }

    try {
      chargePi = await stripe.paymentIntents.create(
        {
          amount: listingFeeCents,
          currency: 'aud',
          customer: customerId,
          payment_method: defaultPaymentMethodId,
          off_session: true,
          confirm: true,
          description: `Quni Listing fee - booking ${booking.id.slice(0, 8)}`,
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
      const err = e as Stripe.errors.StripeError
      const code = err?.code ? String(err.code) : ''
      const raw = err?.raw && typeof err.raw === 'object' ? err.raw : null
      const piFromErr = err?.payment_intent
      const piFromRaw =
        raw && 'payment_intent' in raw && raw.payment_intent && typeof raw.payment_intent === 'object'
          ? raw.payment_intent
          : null
      const paymentIntent = (piFromErr && typeof piFromErr === 'object' ? piFromErr : piFromRaw) as
        | Stripe.PaymentIntent
        | null

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

      const declineCode = err?.decline_code ? String(err.decline_code) : ''
      const msg = err?.message ? String(err.message) : 'Payment failed'

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
      listing_fee_stripe_payment_intent_id: chargePi?.id ?? null,
      listing_agreement_status: 'pending',
      listing_agreement_error: null,
    })
    .eq('id', booking.id)
    .in('status', ['pending_confirmation', 'awaiting_info'])
    .select('id, status, bond_window_expires_at, service_tier_final, confirmed_at')

  if (upErr) {
    console.error('[confirm-listing] booking update', upErr)
    return jsonFail(500, { error: 'Could not update booking after charge' })
  }

  const updated = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows

  if (!updated) {
    const { data: again } = await admin
      .from('bookings')
      .select(
        'id, status, bond_window_expires_at, service_tier_final, stripe_payment_intent_id, listing_agreement_status',
      )
      .eq('id', booking.id)
      .maybeSingle()
    if (again?.status === 'bond_pending') {
      try {
        await unlockConversationOnBookingConfirmed(admin, booking.id, { landlordUserId })
      } catch (e) {
        console.error('[confirm-listing] conversation unlock (idempotent)', e)
      }
      return {
        ok: true,
        idempotent: true,
        status: 'bond_pending',
        bond_window_expires_at: again.bond_window_expires_at ?? bondWindow,
        service_tier_final: 'listing',
        listing_agreement_status: again.listing_agreement_status ?? null,
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
      stripe_payment_intent_id: chargePi?.id ?? null,
      amount_cents: listingFeeCents,
      fee_exempt: feeExempt,
      bond_window_expires_at: bondWindow,
    },
  })

  if (evErr) {
    console.error('[confirm-listing] service_tier_events insert', evErr)
  }

  let listingAgreementStatus: 'pending' | 'ready' | 'failed' = 'pending'

  const gen = await triggerListingDocumentGeneration({
    admin,
    bookingId: booking.id,
    deferSigning: false,
  })

  if (!gen.ok) {
    listingAgreementStatus = 'failed'
    const errMsg = [gen.error, gen.detail].filter(Boolean).join(': ')
    await setListingAgreementStatus(admin, booking.id, 'failed', errMsg)
    console.error('[confirm-listing] document generation failed', gen)
  } else if (gen.skipped) {
    listingAgreementStatus = 'failed'
    await setListingAgreementStatus(
      admin,
      booking.id,
      'failed',
      `Skipped: ${gen.reason ?? 'unknown'}`,
    )
    console.error('[confirm-listing] document generation skipped unexpectedly', gen)
  } else if (docGenSucceededForSigning(gen)) {
    listingAgreementStatus = 'ready'
    await setListingAgreementStatus(admin, booking.id, 'ready', null)
    try {
      await sendListingAgreementReadyEmails(admin, booking.id)
    } catch (e) {
      console.error('[confirm-listing] agreement-ready emails', e)
    }
  } else {
    listingAgreementStatus = 'failed'
    await setListingAgreementStatus(
      admin,
      booking.id,
      'failed',
      'Agreement PDF created but signing was not dispatched',
    )
    console.error('[confirm-listing] document generation incomplete (no signing)', gen)
  }

  try {
    await sendListingBookingAcceptedEmails(admin, booking.id, {
      bond_window_expires_at: bondWindow,
      deviceCtx,
    })
  } catch (e) {
    console.error('[confirm-listing] acceptance emails', e)
  }

  try {
    await unlockConversationOnBookingConfirmed(admin, booking.id, { landlordUserId })
  } catch (e) {
    console.error('[confirm-listing] conversation unlock', e)
  }

  return {
    ok: true,
    idempotent: false,
    status: 'bond_pending',
    bond_window_expires_at: bondWindow,
    service_tier_final: 'listing',
    listing_fee_payment_intent_id: chargePi?.id ?? null,
    listing_agreement_status: listingAgreementStatus,
  }
}
