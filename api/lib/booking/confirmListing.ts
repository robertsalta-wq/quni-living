import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../src/lib/database.types.js'
import {
  sendListingAgreementReadyEmails,
  sendListingBookingAcceptedEmails,
} from './listingTransactionalEmails.js'
import { triggerListingDocumentGeneration } from './triggerListingDocumentGeneration.js'
import { unlockConversationOnBookingConfirmed } from '../messaging/bookingConversation.js'
import { landlordHostIdentityReadyForConfirm } from '../landlordVerifiedSync.js'
import { landlordHasUnpaidLeaseCharge } from '../billing/listingLeaseCharge.js'
import { preflightListingTenancyDocument } from '../documents/listingTenancyGeneration/index.js'
import { TENANT_LEGAL_NAME_NOT_READY_CODE } from './assertStudentLegalNameForSigning.js'
import { setListingAgreementStatus } from './listingAgreementStatus.js'
import { propertyPayoutDetailsComplete, propertyPayoutDetailsQldRoomingComplete } from '../../../src/lib/propertyPayoutDetails.js'
import {
  isQldRoomingArrangement,
  resolveTenancyPackage,
  tenancyPackageInputFromBooking,
} from '../resolveTenancyPackage.js'

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
  qldHouseRulesAttested?: boolean
}

export async function runListingConfirmBooking(
  params: RunListingConfirmBookingParams,
): Promise<ConfirmFail | ConfirmOk> {
  const { stripe, admin, landlord, bookingId, deviceCtx = null, qldHouseRulesAttested } = params
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
      qld_house_rules_attested_at,
      properties ( state, property_type, is_registered_rooming_house, rooms_rented_to_residents, qld_shares_kitchen_or_bathroom )
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

  if (await landlordHasUnpaidLeaseCharge(admin, landlord.id)) {
    return jsonFail(402, {
      error: 'listing_charge_unpaid',
      message:
        'A lease fee is still unpaid. Pay that invoice before accepting another booking. The signed lease itself is not affected.',
    })
  }

  const confirmableListing =
    booking.status === 'pending_confirmation' || booking.status === 'awaiting_info'
  if (!confirmableListing) {
    return jsonFail(400, {
      error: 'invalid_status',
      message: 'Listing confirmation requires status pending_confirmation or awaiting_info.',
    })
  }

  // Listing identity: keep this check in lockstep with confirm-booking.ts (shared helper).
  if (!landlordHostIdentityReadyForConfirm(landlord, { tier: 'listing' })) {
    return jsonFail(400, {
      error: 'host_identity_not_ready',
      message: 'Complete Stripe identity verification before accepting bookings.',
    })
  }

  const propEmbed =
    booking.properties && typeof booking.properties === 'object' && !Array.isArray(booking.properties)
      ? (booking.properties as Record<string, unknown>)
      : {}
  const tenancyPackage = resolveTenancyPackage(tenancyPackageInputFromBooking(booking, propEmbed))
  const qldRooming = isQldRoomingArrangement(tenancyPackage)

  {
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
      .select('account_name, bsb, account_number, bank_name')
      .eq('property_id', propertyId)
      .maybeSingle()
    if (payoutErr) {
      console.error('[confirm-listing] load payout details', payoutErr)
      return jsonFail(503, {
        error: 'listing_payout_details_unavailable',
        message: 'Could not verify payout bank details. Try again shortly.',
      })
    }
    const payoutOk = qldRooming
      ? propertyPayoutDetailsQldRoomingComplete(payoutRow)
      : propertyPayoutDetailsComplete(payoutRow)
    if (!payoutOk) {
      return jsonFail(400, {
        error: 'listing_payout_details_missing',
        message: qldRooming
          ? 'Add payout bank details including bank name for this property before accepting.'
          : 'Add payout bank details for this property before accepting.',
      })
    }
  }

  const alreadyAttested =
    typeof (booking as { qld_house_rules_attested_at?: string | null }).qld_house_rules_attested_at === 'string' &&
    Boolean((booking as { qld_house_rules_attested_at?: string | null }).qld_house_rules_attested_at?.trim())
  if (qldRooming && !alreadyAttested) {
    if (qldHouseRulesAttested !== true) {
      return jsonFail(400, {
        error: 'qld_house_rules_attestation_required',
        message:
          'Form R18 cannot be produced until the provider attests that the house rules have been given to the resident. Signing without that is an offence under s 275 (10 penalty units).',
      })
    }
    const attestedAt = new Date().toISOString()
    const { error: attestErr } = await admin
      .from('bookings')
      .update({ qld_house_rules_attested_at: attestedAt })
      .eq('id', booking.id)
    if (attestErr) {
      console.error('[confirm-listing] qld house rules attestation', attestErr)
      return jsonFail(500, {
        error: 'qld_house_rules_attestation_failed',
        message: 'Could not record house-rules attestation. Try again shortly.',
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

  const nowIso = new Date().toISOString()
  const bondWindow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: updatedRows, error: upErr } = await admin
    .from('bookings')
    .update({
      status: 'bond_pending',
      service_tier_final: 'listing',
      bond_window_expires_at: bondWindow,
      confirmed_at: nowIso,
      listing_fee_stripe_payment_intent_id: null,
      listing_agreement_status: 'pending',
      listing_agreement_error: null,
    })
    .eq('id', booking.id)
    .in('status', ['pending_confirmation', 'awaiting_info'])
    .select('id, status, bond_window_expires_at, service_tier_final, confirmed_at')

  if (upErr) {
    console.error('[confirm-listing] booking update', upErr)
    return jsonFail(500, { error: 'Could not update booking' })
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

  try {
    const { recordBookingEvent } = await import('./events/recordBookingEvent.js')
    await recordBookingEvent(admin, {
      bookingId: booking.id,
      landlordId: booking.landlord_id,
      studentId: booking.student_id,
      eventType: 'booking.confirmed',
      actorType: 'landlord',
      actorId: landlord.id,
      provider: null,
      providerRef: null,
      deviceCtx,
      metadata: {
        lease_fee_timing: 'on_signing',
        bond_window_expires_at: bondWindow,
        service_tier: 'listing',
      },
    })
  } catch (evErr) {
    console.error('[confirm-listing] booking.confirmed event', evErr)
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
    listing_fee_payment_intent_id: null,
    listing_agreement_status: listingAgreementStatus,
  }
}
