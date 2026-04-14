// @ts-nocheck — Vercel Node handler; gradual typing deferred.
/**
 * Landlord confirms a booking: captures the student's booking-deposit PaymentIntent (one-off) and
 * creates a weekly rent Stripe subscription (Connect).
 *
 * Move-in far in the future: Stripe rejects billing_cycle_anchor beyond ~one weekly period; we use
 * trial_end = move-in so the first rent invoice aligns with the tenancy start.
 *
 * POST JSON: { bookingId }
 * Authorization: Bearer <Supabase access_token> (landlord)
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from './lib/sendEmail.js'
import {
  bookingConfirmedStudent,
  bookingConfirmedLandlord,
  bookingAutoDeclinedPropertyTakenStudent,
  propertyAddressLine,
} from './lib/emailTemplates.js'
import { captureSentryMessageEdge } from './lib/sentryEdgeCapture.js'
import { bondAuthorityForState } from './lib/bondAuthority.js'
import { headerString, readJsonBody } from './lib/nodeHandler.js'
import {
  resolveTenancyPackage,
  tenancyGeneratorToApiPath,
} from '../src/lib/tenancy/resolveTenancyPackage'

/** Node runtime: isolates this route from Edge bundles (Stripe + internal fetch); avoids Vercel Edge cross-bundle issues with other /api routes. */
export const config = { runtime: 'nodejs', maxDuration: 60 }

function corsJson(res, body, status = 200, origin) {
  const allowOrigin = origin || '*'
  res.setHeader('Access-Control-Allow-Origin', allowOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  return res.status(status).json(body)
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

/** Absolute origin for serverless → serverless calls (relative /api/... URLs fail on Vercel). */
function internalApiOrigin() {
  const explicit = (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || '').trim().replace(/\/$/, '')
  if (explicit.startsWith('http://') || explicit.startsWith('https://')) {
    return explicit
  }
  const vercel = (process.env.VERCEL_URL || '').trim().replace(/\/$/, '')
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, '')
    return `https://${host}`
  }
  return 'https://quni-living.vercel.app'
}

export default async function handler(req, res) {
  const origin = headerString(req.headers, 'origin') || '*'

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.setHeader('Access-Control-Max-Age', '86400')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return corsJson(res, { error: 'Method not allowed' }, 405, origin)
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!stripeSecret || !supabaseUrl || !serviceRole || !anonKey) {
    return corsJson(res, { error: 'Server misconfigured' }, 500, origin)
  }

  const auth = headerString(req.headers, 'authorization')
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return corsJson(res, { error: 'Missing authorization' }, 401, origin)
  }

  let body
  try {
    body = await readJsonBody(req)
  } catch {
    return corsJson(res, { error: 'Invalid JSON' }, 400, origin)
  }

  const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
  if (!bookingId) {
    return corsJson(res, { error: 'bookingId is required' }, 400, origin)
  }

  try {
    const supabaseAuth = createClient(supabaseUrl, anonKey)
    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser(token)

    if (userErr || !user) {
      return corsJson(res,{ error: 'Invalid or expired session' }, 401, origin)
    }

    if (user.user_metadata?.role !== 'landlord') {
      return corsJson(res,{ error: 'Only landlord accounts can confirm bookings' }, 403, origin)
    }

    const admin = createClient(supabaseUrl, serviceRole)

    const { data: landlord, error: llErr } = await admin
      .from('landlord_profiles')
      .select('id, stripe_connect_account_id, stripe_charges_enabled')
      .eq('user_id', user.id)
      .maybeSingle()

    if (llErr || !landlord) {
      return corsJson(res,{ error: 'Landlord profile not found' }, 404, origin)
    }

    if (landlord.stripe_charges_enabled !== true) {
      return corsJson(res,{ error: 'Landlord Stripe account not ready for charges' }, 400, origin)
    }

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
      properties ( title, address, suburb, state, postcode, rent_per_week, property_type, is_registered_rooming_house ),
      student_profiles ( user_id, stripe_customer_id, email, full_name, first_name, last_name ),
      landlord_profiles ( user_id, email, full_name, phone )
    `,
      )
      .eq('id', bookingId)
      .maybeSingle()

    if (bErr || !booking) {
      return corsJson(res,{ error: 'Booking not found' }, 404, origin)
    }

    if (booking.landlord_id !== landlord.id) {
      return corsJson(res,{ error: 'Forbidden' }, 403, origin)
    }

    const confirmable = booking.status === 'pending_confirmation' || booking.status === 'awaiting_info'
    if (!confirmable) {
      return corsJson(res,
        {
          error: 'invalid_status',
          message: 'This booking cannot be confirmed in its current state.',
        },
        400,
        origin,
      )
    }

    if (booking.expires_at && new Date(booking.expires_at).getTime() < Date.now()) {
      return corsJson(res,{ error: 'This booking request has expired' }, 400, origin)
    }

    if (!booking.stripe_payment_intent_id) {
      return corsJson(res,{ error: 'Booking has no payment on file' }, 400, origin)
    }

    if (!landlord.stripe_connect_account_id || !landlord.stripe_charges_enabled) {
      return corsJson(res,{ error: 'Connect payouts are not ready on your account' }, 400, origin)
    }

    const moveIn = (booking.move_in_date || booking.start_date || '').slice(0, 10)
    if (!moveIn) {
      return corsJson(res,{ error: 'Booking is missing move-in date' }, 400, origin)
    }

    const weeklyCents = weeklyRentCents(booking.weekly_rent)
    if (weeklyCents == null) {
      return corsJson(res,{ error: 'Invalid weekly rent' }, 400, origin)
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
    })
    if (!tenancyPackage.supported) {
      console.error('[create-rent-subscription] unsupported tenancy package', {
        unsupportedReason: tenancyPackage.unsupportedReason,
        state: tenancyState,
        property_type: tenancyPt,
        is_registered_rooming_house: tenancyRooming,
      })
      return corsJson(
        res,
        {
          error: 'tenancy_package_unsupported',
          message:
            tenancyPackage.unsupportedReason ??
            'This property is not supported for tenancy documents yet.',
        },
        400,
        origin,
      )
    }

    const stripe = new Stripe(stripeSecret)
    const piId = booking.stripe_payment_intent_id

    let pi = await stripe.paymentIntents.retrieve(piId)
    if (pi.status === 'requires_capture') {
      pi = await stripe.paymentIntents.capture(piId)
    } else if (pi.status !== 'succeeded') {
      return corsJson(res,{ error: `Payment is not ready to capture (status: ${pi.status})` }, 400, origin)
    }

    let pmId = typeof pi.payment_method === 'string' ? pi.payment_method : pi.payment_method?.id
    if (!pmId) {
      return corsJson(res,{ error: 'No payment method on file for this booking' }, 400, origin)
    }

    const sp =
      booking.student_profiles && typeof booking.student_profiles === 'object' ? booking.student_profiles : {}
    const lp =
      booking.landlord_profiles && typeof booking.landlord_profiles === 'object' ? booking.landlord_profiles : {}
    let customerId = typeof sp.stripe_customer_id === 'string' ? sp.stripe_customer_id.trim() : null
    if (!customerId) {
      return corsJson(res,{ error: 'Student billing profile is missing' }, 400, origin)
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
            return corsJson(res,
              {
                error:
                  'This booking’s card cannot be charged again for weekly rent (Stripe single-use limitation). Ask the student to add a saved payment method under Student profile → Payments, then try confirming again. New bookings will save the card automatically.',
              },
              400,
              origin,
            )
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
      return corsJson(res,{ error: 'Invalid lease length for subscription' }, 400, origin)
    }

    const rentProduct = await stripe.products.create({
      name: `Weekly rent — ${propertyTitle}`,
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
      application_fee_percent: 8,
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

    const subscription = await stripe.subscriptions.create(subscriptionBody)

    const nowIso = new Date().toISOString()
    const { error: upErr } = await admin
      .from('bookings')
      .update({
        status: 'confirmed',
        confirmed_at: nowIso,
        stripe_subscription_id: subscription.id,
        stripe_subscription_status: subscription.status,
      })
      .eq('id', booking.id)

    if (upErr) {
      console.error('booking update after subscription', upErr)
      return corsJson(res,{ error: 'Could not save booking after subscription' }, 500, origin)
    }

    const siteBase =
      origin && origin !== '*'
        ? origin.replace(/\/$/, '')
        : (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://quni-living.vercel.app').replace(/\/$/, '')

    const propRowForAutoDecline =
      booking.properties && typeof booking.properties === 'object' ? booking.properties : {}
    const addrForAutoDecline = propertyAddressLine(propRowForAutoDecline)
    const titleForAutoDecline =
      booking.properties && typeof booking.properties === 'object' && 'title' in booking.properties
        ? String(booking.properties.title ?? 'Property')
        : 'Property'

    const { data: competitors, error: compErr } = await admin
      .from('bookings')
      .select(
        `
        id,
        stripe_payment_intent_id,
        student_profiles ( email, full_name, first_name, last_name )
      `,
      )
      .eq('property_id', booking.property_id)
      .neq('id', booking.id)
      .in('status', ['pending_confirmation', 'awaiting_info'])

    const runCompetitorDeclines = async () => {
      if (compErr) {
        console.error('load competitor bookings', compErr)
        return
      }
      for (const row of competitors ?? []) {
        const nowDecline = new Date().toISOString()
        const { error: decErr } = await admin
          .from('bookings')
          .update({
            status: 'declined',
            declined_at: nowDecline,
            decline_reason: 'property_taken',
          })
          .eq('id', row.id)

        if (decErr) {
          console.error('auto-decline update', decErr)
          continue
        }

        const piRow = typeof row.stripe_payment_intent_id === 'string' ? row.stripe_payment_intent_id.trim() : ''
        if (piRow) {
          try {
            const opi = await stripe.paymentIntents.retrieve(piRow)
            if (opi.status === 'requires_capture' || opi.status === 'requires_confirmation') {
              await stripe.paymentIntents.cancel(piRow)
            } else if (opi.status === 'succeeded') {
              await stripe.refunds.create({ payment_intent: piRow })
            }
          } catch (stripeEx) {
            console.error('auto-decline stripe', stripeEx)
            const errText = stripeEx instanceof Error ? stripeEx.message : String(stripeEx)
            await captureSentryMessageEdge('Auto-decline refund/cancel failed after property confirmed', {
              declinedBookingId: row.id,
              propertyId: booking.property_id,
              paymentIntentId: piRow,
              err: errText,
            })
            try {
              await sendEmail({
                to: 'hello@quni.com.au',
                subject: `Urgent: auto-decline refund failed — booking ${row.id}`,
                html: `<p>Refund/cancel failed for booking <code>${row.id}</code> after another booking was confirmed for the same property.</p>
<p>Property id: <code>${booking.property_id}</code></p>
<p>PaymentIntent: <code>${piRow}</code></p>
<p>Error: ${errText.replace(/</g, '&lt;')}</p>`,
              })
            } catch (mailEx) {
              console.error('alert hello@quni.com.au failed', mailEx)
            }
          }
        }

        const stRow = row.student_profiles && typeof row.student_profiles === 'object' ? row.student_profiles : {}
        const compEmail = typeof stRow.email === 'string' ? stRow.email.trim() : ''
        const compName =
          [stRow.first_name, stRow.last_name].filter(Boolean).join(' ').trim() ||
          (typeof stRow.full_name === 'string' && stRow.full_name.trim()) ||
          'there'

        if (compEmail) {
          try {
            const t = bookingAutoDeclinedPropertyTakenStudent({
              student_name: compName,
              property_address: addrForAutoDecline || titleForAutoDecline,
              property_title: titleForAutoDecline,
              listings_url: `${siteBase}/listings`,
            })
            await sendEmail({ to: compEmail, subject: t.subject, html: t.html })
          } catch (mailEx) {
            console.error('auto-decline student email', mailEx)
          }
        }
      }
    }

    await runCompetitorDeclines()

    const propForBond =
      booking.properties && typeof booking.properties === 'object' ? booking.properties : {}
    const bondState = typeof propForBond.state === 'string' && propForBond.state.trim() ? propForBond.state.trim() : 'NSW'
    const bondAuthority = bondAuthorityForState(bondState)
    const studentUserId = typeof sp.user_id === 'string' && sp.user_id.trim() ? sp.user_id.trim() : null
    const landlordUserId = typeof lp.user_id === 'string' && lp.user_id.trim() ? lp.user_id.trim() : null

    if (
      studentUserId &&
      landlordUserId &&
      booking.property_id &&
      tenancyPackage.bondRules.schemeApplies
    ) {
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
    const landlordPhone = typeof lp.phone === 'string' && lp.phone.trim() ? lp.phone.trim() : '—'

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
          tenancyPackage.bondRules.schemeApplies && bondCentsForEmail > 0
            ? bondCentsForEmail
            : undefined,
        bond_authority: bondAuthority,
        dashboard_url: `${siteBase}/landlord/dashboard?tab=bookings`,
      })
      await sendEmail({ to: landlordEmail, subject: t.subject, html: t.html })
    }

    /**
     * Emails + tenancy/PDF generation must finish in this invocation.
     * Previously on Vercel we only used waitUntil() and skipped await — the background work could be cut off
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
        '[create-rent-subscription] skipping generate-lease: INTERNAL_DOC_FLOW_SECRET is not set',
      )
    } else if (!booking.property_id) {
      console.warn('[create-rent-subscription] skipping document generate: booking has no property_id')
    } else {
      const generatePath = tenancyGeneratorToApiPath(tenancyPackage.generator)
      if (!generatePath) {
        console.error(
          '[create-rent-subscription] no document API wired for generator yet',
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

    return corsJson(res,
      {
        ok: true,
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
      },
      200,
      origin,
    )
  } catch (e) {
    console.error('create-rent-subscription', e)
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
    return corsJson(res,{ error: msg.slice(0, 500) }, 500, origin)
  }
}
