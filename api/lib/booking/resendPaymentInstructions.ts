import type { SupabaseClient } from '@supabase/supabase-js'

import { resolveTenancyPackage, tenancyPackageUsesOccupancyAgreement } from '../resolveTenancyPackage.js'
import { propertyPayoutDetailsComplete } from '../../../src/lib/propertyPayoutDetails.js'
import { sendListingPaymentInstructionsRenter } from './listingTransactionalEmails.js'

export const RESEND_COOLDOWN_MINUTES = 15

const RESEND_ALLOWED_STATUSES = new Set(['bond_pending', 'confirmed', 'active'])

export type ResendPaymentInstructionsResult =
  | { ok: true }
  | { ok: false; status: number; code: string; message: string }

function warn(logger: Pick<Console, 'warn'> | undefined, msg: string, err?: unknown) {
  const fn = logger?.warn ?? console.warn
  if (err !== undefined) fn(msg, err)
  else fn(msg)
}

function formatRetryAfter(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return 'later'
  const retryAt = new Date(t + RESEND_COOLDOWN_MINUTES * 60_000)
  return retryAt.toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Australia/Sydney',
  })
}

/**
 * Landlord-initiated resend of bond/rent payment instructions to the renter.
 */
export async function runResendPaymentInstructionsLandlord(args: {
  admin: SupabaseClient
  landlordProfileId: string
  bookingId: string
  logger?: Pick<Console, 'warn'>
  deviceCtx?: { user_agent: string; is_mobile: boolean } | null
}): Promise<ResendPaymentInstructionsResult> {
  const { admin, landlordProfileId, bookingId, logger, deviceCtx = null } = args

  const { data: booking, error: loadErr } = await admin
    .from('bookings')
    .select(
      `
      id,
      landlord_id,
      student_id,
      property_id,
      status,
      service_tier_final,
      move_in_date,
      start_date,
      properties (
        state,
        property_type,
        is_registered_rooming_house,
        qld_bond_remittance_preference
      )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (loadErr) {
    warn(logger, '[resend-payment-instructions] load booking', loadErr)
    return { ok: false, status: 500, code: 'db_error', message: 'Could not load booking.' }
  }
  if (!booking) {
    return { ok: false, status: 404, code: 'not_found', message: 'Booking not found.' }
  }

  if (booking.landlord_id !== landlordProfileId) {
    return { ok: false, status: 403, code: 'forbidden', message: 'Forbidden.' }
  }

  if (booking.service_tier_final !== 'listing') {
    return {
      ok: false,
      status: 400,
      code: 'wrong_tier',
      message: 'Payment instructions can only be resent for Listing bookings.',
    }
  }

  const st = booking.status as string
  if (!RESEND_ALLOWED_STATUSES.has(st)) {
    return {
      ok: false,
      status: 409,
      code: 'invalid_status',
      message: 'Payment instructions can only be resent while the booking is active.',
    }
  }

  const prop = (booking.properties && typeof booking.properties === 'object' ? booking.properties : {}) as {
    state?: string | null
    property_type?: string | null
    is_registered_rooming_house?: boolean | null
    qld_bond_remittance_preference?: string | null
  }
  const propState = typeof prop.state === 'string' && prop.state.trim() ? prop.state.trim() : 'NSW'
  const propertyType = typeof prop.property_type === 'string' ? prop.property_type.trim() : ''
  const isRooming = Boolean(prop.is_registered_rooming_house)
  const moveInRaw =
    (typeof booking.move_in_date === 'string' && booking.move_in_date.trim()) ||
    (typeof booking.start_date === 'string' && booking.start_date.trim()) ||
    ''

  const tenancyPackage = resolveTenancyPackage({
    state: propState,
    property_type: propertyType,
    is_registered_rooming_house: isRooming,
    date: moveInRaw || undefined,
  })

  if (!tenancyPackageUsesOccupancyAgreement(tenancyPackage)) {
    return {
      ok: false,
      status: 400,
      code: 'not_boarder_lodger',
      message: 'Payment instructions resend applies only to boarder/lodger Listing bookings.',
    }
  }

  const propertyId =
    typeof booking.property_id === 'string' && booking.property_id.trim() ? booking.property_id.trim() : ''
  if (!propertyId) {
    return {
      ok: false,
      status: 400,
      code: 'payout_incomplete',
      message: 'Payee bank details are not complete for this property.',
    }
  }

  const { data: payoutRow, error: payoutErr } = await admin
    .from('property_payout_details')
    .select('account_name, bsb, account_number')
    .eq('property_id', propertyId)
    .maybeSingle()

  if (payoutErr) {
    warn(logger, '[resend-payment-instructions] load payout', payoutErr)
    return { ok: false, status: 500, code: 'db_error', message: 'Could not load payee details.' }
  }

  if (!propertyPayoutDetailsComplete(payoutRow)) {
    return {
      ok: false,
      status: 400,
      code: 'payout_incomplete',
      message: 'Payee bank details are not complete for this property.',
    }
  }

  let lastCreatedAt: string | null = null
  try {
    const { findLatestLifecycleEvent } = await import('./events/findLatestLifecycleEvent.js')
    const lastEvent = await findLatestLifecycleEvent(admin, {
      bookingId,
      bookingEventType: 'payment_instructions.resent',
      steEventType: 'payment_instructions_resent',
    })
    lastCreatedAt = lastEvent.createdAt
  } catch (evErr) {
    warn(logger, '[resend-payment-instructions] rate-limit query', evErr)
    return { ok: false, status: 500, code: 'db_error', message: 'Could not check resend cooldown.' }
  }

  if (lastCreatedAt) {
    const lastMs = new Date(lastCreatedAt).getTime()
    if (Number.isFinite(lastMs)) {
      const elapsedMs = Date.now() - lastMs
      const cooldownMs = RESEND_COOLDOWN_MINUTES * 60_000
      if (elapsedMs < cooldownMs) {
        const retryAfter = formatRetryAfter(lastCreatedAt)
        return {
          ok: false,
          status: 429,
          code: 'rate_limited',
          message: `Payment instructions were sent recently. You can resend again after ${retryAfter}.`,
        }
      }
    }
  }

  let sendResult: Awaited<ReturnType<typeof sendListingPaymentInstructionsRenter>>
  try {
    sendResult = await sendListingPaymentInstructionsRenter(admin, bookingId, { deviceCtx })
  } catch (e) {
    warn(logger, '[resend-payment-instructions] send email', e)
    const msg = e instanceof Error ? e.message : 'Could not send email.'
    return { ok: false, status: 502, code: 'email_failed', message: msg }
  }

  if (!sendResult.ok) {
    return {
      ok: false,
      status: sendResult.code === 'not_found' ? 404 : 400,
      code: sendResult.code,
      message: sendResult.message,
    }
  }

  const qldPreference =
    typeof prop.qld_bond_remittance_preference === 'string' ? prop.qld_bond_remittance_preference : null
  const schemeApplies = tenancyPackage.supported ? Boolean(tenancyPackage.rules.bond?.schemeApplies) : false

  const { data: studentProfile } = await admin
    .from('student_profiles')
    .select('email')
    .eq('id', booking.student_id as string)
    .maybeSingle()

  const studentEmail =
    studentProfile && typeof studentProfile.email === 'string' ? studentProfile.email.trim() : ''

  try {
    const { recordBookingEvent } = await import('./events/recordBookingEvent.js')
    await recordBookingEvent(admin, {
      bookingId: booking.id as string,
      landlordId: booking.landlord_id as string | null,
      studentId: booking.student_id as string | null,
      eventType: 'payment_instructions.resent',
      actorType: 'landlord',
      deviceCtx,
      metadata: {
        triggered_by: 'landlord',
        student_email: studentEmail || null,
        payout_present: true,
        scheme_applies: schemeApplies,
        qld_preference: qldPreference,
        service_tier: 'listing',
      },
    })
  } catch (insertErr) {
    warn(logger, '[resend-payment-instructions] payment_instructions.resent event', insertErr)
  }

  return { ok: true }
}
