// @ts-nocheck - shared Managed confirm (Stripe + subscription); consumed by confirm-booking.
/**
 * Landlord confirms a booking (managed tier): captures the student's booking-deposit PaymentIntent and
 * creates a weekly rent Stripe subscription (Connect).
 */
import Stripe from 'stripe'
import { sendEmail } from '../../lib/sendEmail.js'
import {
  bookingConfirmedStudent,
  bookingConfirmedLandlord,
  propertyAddressLine,
} from '../../lib/emailTemplates.js'
import { declineCompetingBookings } from './declineCompetingBookings.js'
import { captureSentryMessageEdge } from '../../lib/sentryEdgeCapture.js'
import { bondAuthorityForState } from '../../lib/bondAuthority.js'
import {
  resolveTenancyPackage,
  tenancyGeneratorToApiPath,
} from '../../lib/resolveTenancyPackage.js'
import { getActivePricingSnapshotForProperty } from '../../lib/pricing/index.js'
import {
  isLandlordFeeExempt,
  resolveManagedApplicationFeePercent,
} from '../../lib/pricing/resolvePlatformFee.js'
import { unlockConversationOnBookingConfirmed } from '../messaging/bookingConversation.js'
import { internalApiOrigin } from '../internalApiOrigin.js'

function jsonFail(status, body) {
  return { ok: false, status, body }
}

function weeklyRentCents(rentPerWeek) {
  const n = Number(rentPerWeek)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

function leaseEndUnixFromMoveIn(moveInIso, leaseLength) {
  const [y, m, d] = moveInIso.split('-').map(Number)
  const start = Date.UTC(y, m - 1, d)
  let weeks = 52
  if (leaseLength === '3 months') weeks = 13
  else if (leaseLength === '6 months') weeks = 26
  else if (leaseLength === '12 months') weeks = 52
  else if (leaseLength === 'Flexible') weeks = 104
  const endMs = start + weeks * 7 * 86400000
  return Math.floor(endMs / 1000)
}

function moveInUnixUtcMidnight(moveInIso) {
  const [y, m, d] = moveInIso.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 1000)
}

/** Headers for internal POSTs (deployment protection bypass when configured on Vercel). */
function internalPostHeaders(secret) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${secret}`,
    'X-Internal-Doc-Flow-Secret': secret,
  }
  const bypass = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim()
  if (bypass) {
    headers['x-vercel-protection-bypass'] = bypass
  }
  return headers
}

export async function runManagedConfirmBooking(params) {
  const { stripe, admin, landlord, bookingId, origin } = params
  try {
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
      weekly_rent,
      move_in_date,
      start_date,
      lease_length,
      expires_at,
      deposit_amount,
      bond_acknowledged,
      properties ( title, address, suburb, state, postcode, rent_per_week, property_type, is_registered_rooming_house, service_tier ),
      student_profiles ( user_id, stripe_customer_id, email, full_name, first_name, last_name ),
      landlord_profiles ( user_id, email, full_name, phone )
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

    const confirmable = booking.status === 'pending_confirmation' || booking.status === 'awaiting_info'
    if (!confirmable) {
      return jsonFail(400, {
        error: 'invalid_status',
        message: 'This booking cannot be confirmed in its current state.',
      })
    }

    if (booking.expires_at && new Date(booking.expires_at).getTime() < Date.now()) {
      return jsonFail(400, { error: 'This booking request has expired' })
    }

    if (!booking.stripe_payment_intent_id) {
      return jsonFail(400, { error: 'Booking has no payment on file' })
    }

    if (!landlord.stripe_connect_account_id || !landlord.stripe_charges_enabled) {
      return jsonFail(400, { error: 'Connect payouts are not ready on your account' })
    }

    const moveIn = (booking.move_in_date || booking.start_date || '').slice(0, 10)
    if (!moveIn) {
      return jsonFail(400, { error: 'Booking is missing move-in date' })
    }

    const weeklyCents = weeklyRentCents(booking.weekly_rent)
    if (weeklyCents == null) {
      return jsonFail(400, { error: 'Invalid weekly rent' })
    }

    const propForTenancy =
      booking.properties && typeof booking.properties === 'object' ? booking.properties : {}
    const tenancyStateRaw = typeof propForTenancy.state === 'string' ? propForTenancy.state.trim() : ''
    const tenancyState = tenancyStateRaw ? tenancyStateRaw.toUpperCase() : 'NSW'
    const tenancyPt =
      typeof propForTenancy.property_type === 'string' ? propForTenancy.property_type.trim() : ''
    const tenancyRooming = Boolean(propForTenancy.is_registered_rooming_house)

    const tenancyPackage = resolveTenancyPackage({
      state: tenancyState,
      property_type: tenancyPt,
      is_registered_rooming_house: tenancyRooming,
      date: moveIn || undefined,
    })
    if (!tenancyPackage.supported) {
      console.error('[confirm-managed] unsupported tenancy package', {
        unsupportedReason: tenancyPackage.unsupportedReason,
        state: tenancyState,
        property_type: tenancyPt,
        is_registered_rooming_house: tenancyRooming,
      })
      return jsonFail(400, {
        error: 'tenancy_package_unsupported',
        message:
          tenancyPackage.unsupportedReason ??
          'This property is not supported for tenancy documents yet.',
      })
    }

    const piId = booking.stripe_payment_intent_id

    let pi = await stripe.paymentIntents.retrieve(piId)
    if (pi.status === 'requires_capture') {
      pi = await stripe.paymentIntents.capture(piId)
    } else if (pi.status !== 'succeeded') {
      return jsonFail(400, { error: `Payment is not ready to capture (status: ${pi.status})` })
    }

    let pmId = typeof pi.payment_method === 'string' ? pi.payment_method : pi.payment_method?.id
    if (!pmId) {
      return jsonFail(400, { error: 'No payment method on file for this booking' })
    }

    const sp =
      booking.student_profiles && typeof booking.student_profiles === 'object' ? booking.student_profiles : {}
    const lp =
      booking.landlord_profiles && typeof booking.landlord_profiles === 'object' ? booking.landlord_profiles : {}
    let customerId = typeof sp.stripe_customer_id === 'string' ? sp.stripe_customer_id.trim() : null
    if (!customerId) {
      return jsonFail(400, { error: 'Student billing profile is missing' })
    }

    /** If deposit PI PM can't be reused, use another card already saved on the student. */
    async function alternatePaymentMethodId(excludeId) {
      const cust = await stripe.customers.retrieve(customerId, {
        expand: ['invoice_settings.default_payment_method'],
      })
      const def = cust.invoice_settings?.default_payment_method
      const defId = typeof def === 'string' ? def : def?.id
      if (defId && defId !== excludeId) return defId
      const list = await stripe.paymentMethods.list({ customer: customerId, type: 'card' })
      for (const pm of list.data) {
        if (pm.id !== excludeId) return pm.id
      }
      return null
    }

    function isPmReuseError(msg) {
      const m = msg.toLowerCase()
      return (
        m.includes('may not be used again') ||
        m.includes('previously used without') ||
        m.includes('was detached') ||
        m.includes('has already been used')
      )
    }

    const pmRecord = await stripe.paymentMethods.retrieve(pmId)
    const alreadyOnCustomer =
      typeof pmRecord.customer === 'string'
        ? pmRecord.customer === customerId
        : pmRecord.customer?.id === customerId

    if (!alreadyOnCustomer) {
      try {
        await stripe.paymentMethods.attach(pmId, { customer: customerId })
      } catch (e) {
        const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : ''
        if (msg.includes('already been attached')) {
          // ok
        } else if (isPmReuseError(msg)) {
          const alt = await alternatePaymentMethodId(pmId)
          if (!alt) {
            return jsonFail(400, {
              error:
                'This booking’s card cannot be charged again for weekly rent (Stripe single-use limitation). Ask the student to add a saved payment method under Student profile → Payments, then try confirming again. New bookings will save the card automatically.',
            })
          }
          pmId = alt
        } else {
          throw e
        }
      }
    }

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: pmId },
    })

    const propertyTitle =
      booking.properties && typeof booking.properties === 'object' && 'title' in booking.properties
        ? String(booking.properties.title ?? 'Property')
        : 'Property'

    const leaseLength = booking.lease_length || 'Flexible'
    const anchor = moveInUnixUtcMidnight(moveIn)
    const cancelAt = leaseEndUnixFromMoveIn(moveIn, leaseLength)

    if (cancelAt <= anchor) {
      return jsonFail(400, { error: 'Invalid lease length for subscription' })
    }

    const rentProduct = await stripe.products.create({
      name: `Weekly rent - ${propertyTitle}`,
      metadata: { booking_id: booking.id, property_id: booking.property_id ?? '' },
    })

    const nowSec = Math.floor(Date.now() / 1000)
    /** Stripe weekly subs reject billing_cycle_anchor beyond ~one period; use trial until move-in. */
    const maxAnchorAheadSec = 6 * 24 * 60 * 60

    const subscriptionBody = {
      customer: customerId,
      items: [
        {
          price_data: {
            currency: 'aud',
            product: rentProduct.id,
            unit_amount: weeklyCents,
            recurring: { interval: 'week' },
          },
        },
      ],
      default_payment_method: pmId,
      transfer_data: { destination: landlord.stripe_connect_account_id },
      application_fee_percent: 0,
      cancel_at: cancelAt,
      metadata: {
        booking_id: booking.id,
        property_id: booking.property_id ?? '',
      },
    }

    if (anchor > nowSec + maxAnchorAheadSec) {
      subscriptionBody.trial_end = anchor
    } else if (anchor > nowSec) {
      subscriptionBody.billing_cycle_anchor = anchor
      subscriptionBody.proration_behavior = 'none'
    } else {
      subscriptionBody.proration_behavior = 'none'
    }

    if (!booking.property_id) {
      return jsonFail(400, { error: 'Booking is missing a property' })
    }

    const managedPricing = await getActivePricingSnapshotForProperty(booking.property_id, 'managed')
    const feeExempt = await isLandlordFeeExempt(admin, landlord.id)
    subscriptionBody.application_fee_percent = resolveManagedApplicationFeePercent(
      feeExempt,
      managedPricing,
    )

    const subscription = await stripe.subscriptions.create(subscriptionBody)

    const nowIso = new Date().toISOString()
    const { error: upErr } = await admin
      .from('bookings')
      .update({
        status: 'confirmed',
        confirmed_at: nowIso,
        stripe_subscription_id: subscription.id,
        stripe_subscription_status: subscription.status,
        service_tier_final: 'managed',
      })
      .eq('id', booking.id)

    if (upErr) {
      console.error('booking update after subscription', upErr)
      return jsonFail(500, { error: 'Could not save booking after subscription' })
    }

    const landlordUserId =
      typeof landlord.user_id === 'string' && landlord.user_id.trim() ? landlord.user_id.trim() : null
    try {
      await unlockConversationOnBookingConfirmed(admin, booking.id, {
        landlordUserId,
      })
    } catch (unlockEx) {
      console.error('[confirm-managed] conversation unlock', unlockEx)
    }

    const propertyWasListing =
      booking.properties &&
      typeof booking.properties === 'object' &&
      booking.properties.service_tier === 'listing'
    if (propertyWasListing && booking.property_id) {
      const { error: propTierErr } = await admin
        .from('properties')
        .update({ service_tier: 'managed' })
        .eq('id', booking.property_id)
        .eq('service_tier', 'listing')
      if (propTierErr) {
        console.error('property service_tier upgrade after managed confirm', propTierErr)
        await captureSentryMessageEdge('Property tier upgrade failed after managed confirm', {
          bookingId: booking.id,
          propertyId: booking.property_id,
          error: propTierErr.message,
        })
      }
    }

    const siteBase =
      origin && origin !== '*'
        ? origin.replace(/\/$/, '')
        : (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://quni.com.au').replace(/\/$/, '')

    if (booking.property_id) {
      await declineCompetingBookings(admin, stripe, {
        propertyId: booking.property_id,
        winningBookingId: booking.id,
        siteBase,
      })
    }

    const propForBond =
      booking.properties && typeof booking.properties === 'object' ? booking.properties : {}
    const bondState = typeof propForBond.state === 'string' && propForBond.state.trim() ? propForBond.state.trim() : 'NSW'
    const bondAuthority = bondAuthorityForState(bondState)
    const studentUserId = typeof sp.user_id === 'string' && sp.user_id.trim() ? sp.user_id.trim() : null

    if (studentUserId && landlordUserId && booking.property_id) {
      const bondCents = weeklyCents * 4
      const { data: existingBond } = await admin.from('bonds').select('id').eq('booking_id', booking.id).maybeSingle()
      if (!existingBond && bondCents > 0) {
        const ackStudent = booking.bond_acknowledged === true
        const { error: bondInsErr } = await admin.from('bonds').insert({
          booking_id: booking.id,
          student_id: studentUserId,
          landlord_id: landlordUserId,
          property_id: booking.property_id,
          bond_amount: bondCents,
          bond_type: 'cash',
          bond_status: 'pending_lodgement',
          state: bondState,
          bond_authority: bondAuthority,
          acknowledged_by_student: ackStudent,
          student_acknowledged_at: ackStudent ? nowIso : null,
          acknowledged_by_landlord: true,
          landlord_acknowledged_at: nowIso,
        })
        if (bondInsErr) {
          console.error('bond insert on confirm', bondInsErr)
        }
      }
    }

    const propRow = booking.properties && typeof booking.properties === 'object' ? booking.properties : {}
    const addr = propertyAddressLine(propRow)
    const title =
      booking.properties && typeof booking.properties === 'object' && 'title' in booking.properties
        ? String(booking.properties.title ?? 'Property')
        : 'Property'
    const studentName =
      [sp.first_name, sp.last_name].filter(Boolean).join(' ').trim() ||
      (typeof sp.full_name === 'string' && sp.full_name.trim()) ||
      'Student'

    const studentEmail = typeof sp.email === 'string' ? sp.email.trim() : ''
    const landlordEmail = typeof lp.email === 'string' ? lp.email.trim() : ''
    const landlordName = typeof lp.full_name === 'string' ? lp.full_name.trim() || 'Host' : 'Host'
    const landlordPhone = typeof lp.phone === 'string' && lp.phone.trim() ? lp.phone.trim() : '-'

    const depositCents = typeof booking.deposit_amount === 'number' ? booking.deposit_amount : null

    const sendStudent = async () => {
      if (!studentEmail) return
      const t = bookingConfirmedStudent({
        student_name: studentName,
        property_address: addr || title,
        property_title: title,
        move_in_date: moveIn,
        lease_length: leaseLength,
        weekly_rent: booking.weekly_rent,
        landlord_name: landlordName,
        landlord_phone: landlordPhone,
        deposit_amount_cents: depositCents ?? undefined,
        dashboard_url: `${siteBase}/student-dashboard`,
      })
      await sendEmail({ to: studentEmail, subject: t.subject, html: t.html })
    }

    const bondCentsForEmail = weeklyCents * 4

    const sendLandlord = async () => {
      if (!landlordEmail) return
      const t = bookingConfirmedLandlord({
        landlord_name: landlordName,
        student_name: studentName,
        property_address: addr || title,
        property_title: title,
        move_in_date: moveIn,
        lease_length: leaseLength,
        weekly_rent: booking.weekly_rent,
        deposit_amount_cents: depositCents ?? undefined,
        bond_amount_cents:
          tenancyPackage.rules.bond.schemeApplies && bondCentsForEmail > 0
            ? bondCentsForEmail
            : undefined,
        bond_authority: bondAuthority,
        dashboard_url: `${siteBase}/landlord/dashboard?tab=bookings`,
      })
      await sendEmail({ to: landlordEmail, subject: t.subject, html: t.html })
    }

    /**
     * Emails + tenancy/PDF generation must finish in this invocation.
     * Previously on Vercel we only used waitUntil() and skipped await - the background work could be cut off
     * after the HTTP response, leaving bookings confirmed without tenancies or documents.
     */
    try {
      await Promise.all([sendStudent(), sendLandlord()])
    } catch (e) {
      console.error('booking confirmed emails (Resend)', e)
    }
    const leaseFlowSecret = (process.env.INTERNAL_DOC_FLOW_SECRET || '').trim()
    if (!leaseFlowSecret) {
      console.warn(
        '[confirm-managed] skipping generate-lease: INTERNAL_DOC_FLOW_SECRET is not set',
      )
    } else if (!booking.property_id) {
      console.warn('[confirm-managed] skipping document generate: booking has no property_id')
    } else {
      const generatePath = tenancyGeneratorToApiPath(tenancyPackage.generator)
      if (!generatePath) {
        console.error(
          '[confirm-managed] no document API wired for generator yet',
          tenancyPackage.generator,
          tenancyPackage.signingPackageName,
        )
      } else {
        const generateDocUrl = `${internalApiOrigin()}${generatePath}`
        try {
          const fetchRes = await fetch(generateDocUrl, {
            method: 'POST',
            headers: internalPostHeaders(leaseFlowSecret),
            body: JSON.stringify({ booking_id: booking.id }),
          })
          if (!fetchRes.ok) {
            const t = await fetchRes.text()
            console.error(`${generatePath} failed`, fetchRes.status, t)
          }
        } catch (e) {
          console.error(`${generatePath} trigger`, e)
        }
      }
    }

    return {
      ok: true,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
    }
  } catch (e) {
    console.error('confirm-managed', e)
    let msg = 'Booking confirmation failed'
    if (e && typeof e === 'object') {
      if ('message' in e && typeof e.message === 'string' && e.message.trim()) {
        msg = e.message.trim()
      }
      const raw = 'raw' in e && e.raw && typeof e.raw === 'object' && 'message' in e.raw
      if (raw && typeof e.raw.message === 'string' && e.raw.message.trim()) {
        msg = e.raw.message.trim()
      }
    }
    return jsonFail(500, { error: msg.slice(0, 500) })
  }
}
