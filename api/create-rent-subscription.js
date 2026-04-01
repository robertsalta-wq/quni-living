/**
 * Landlord confirms booking: capture deposit PI + create weekly rent subscription (Connect).
 *
 * POST JSON: { bookingId }
 * Authorization: Bearer <Supabase access_token> (landlord)
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'
import { sendEmail } from './lib/sendEmail.js'
import {
  bookingConfirmedStudent,
  bookingConfirmedLandlord,
  propertyAddressLine,
} from './lib/emailTemplates.js'
import { bondAuthorityForState } from './lib/bondAuthority.js'

export const config = { runtime: 'edge' }

function json(body, status = 200, origin) {
  const allowOrigin = origin || '*'
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  })
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

export default async function handler(request) {
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin)
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!stripeSecret || !supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500, origin)
  }

  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return json({ error: 'Missing authorization' }, 401, origin)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400, origin)
  }

  const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
  if (!bookingId) {
    return json({ error: 'bookingId is required' }, 400, origin)
  }

  try {
  const supabaseAuth = createClient(supabaseUrl, anonKey)
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser(token)

  if (userErr || !user) {
    return json({ error: 'Invalid or expired session' }, 401, origin)
  }

  if (user.user_metadata?.role !== 'landlord') {
    return json({ error: 'Only landlord accounts can confirm bookings' }, 403, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)

  const { data: landlord, error: llErr } = await admin
    .from('landlord_profiles')
    .select('id, stripe_connect_account_id, stripe_charges_enabled')
    .eq('user_id', user.id)
    .maybeSingle()

  if (llErr || !landlord) {
    return json({ error: 'Landlord profile not found' }, 404, origin)
  }

  if (landlord.stripe_charges_enabled !== true) {
    return json({ error: 'Landlord Stripe account not ready for charges' }, 400, origin)
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
      properties ( title, address, suburb, state, postcode, rent_per_week ),
      student_profiles ( user_id, stripe_customer_id, email, full_name, first_name, last_name ),
      landlord_profiles ( user_id, email, full_name, phone )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (bErr || !booking) {
    return json({ error: 'Booking not found' }, 404, origin)
  }

  if (booking.landlord_id !== landlord.id) {
    return json({ error: 'Forbidden' }, 403, origin)
  }

  if (booking.status !== 'pending_confirmation') {
    return json({ error: 'Booking is not awaiting confirmation' }, 400, origin)
  }

  if (booking.expires_at && new Date(booking.expires_at).getTime() < Date.now()) {
    return json({ error: 'This booking request has expired' }, 400, origin)
  }

  if (!booking.stripe_payment_intent_id) {
    return json({ error: 'Booking has no payment on file' }, 400, origin)
  }

  if (!landlord.stripe_connect_account_id || !landlord.stripe_charges_enabled) {
    return json({ error: 'Connect payouts are not ready on your account' }, 400, origin)
  }

  const moveIn = (booking.move_in_date || booking.start_date || '').slice(0, 10)
  if (!moveIn) {
    return json({ error: 'Booking is missing move-in date' }, 400, origin)
  }

  const weeklyCents = weeklyRentCents(booking.weekly_rent)
  if (weeklyCents == null) {
    return json({ error: 'Invalid weekly rent' }, 400, origin)
  }

  const stripe = new Stripe(stripeSecret)
  const piId = booking.stripe_payment_intent_id

  let pi = await stripe.paymentIntents.retrieve(piId)
  if (pi.status === 'requires_capture') {
    pi = await stripe.paymentIntents.capture(piId)
  } else if (pi.status !== 'succeeded') {
    return json({ error: `Payment is not ready to capture (status: ${pi.status})` }, 400, origin)
  }

  let pmId = typeof pi.payment_method === 'string' ? pi.payment_method : pi.payment_method?.id
  if (!pmId) {
    return json({ error: 'No payment method on file for this booking' }, 400, origin)
  }

  const sp =
    booking.student_profiles && typeof booking.student_profiles === 'object' ? booking.student_profiles : {}
  const lp =
    booking.landlord_profiles && typeof booking.landlord_profiles === 'object' ? booking.landlord_profiles : {}
  let customerId = sp.stripe_customer_id?.trim() || null
  if (!customerId) {
    return json({ error: 'Student billing profile is missing' }, 400, origin)
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
          return json(
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
    return json({ error: 'Invalid lease length for subscription' }, 400, origin)
  }

  // Stripe subscription items[].price_data requires `product` (id), not inline `product_data`.
  const rentProduct = await stripe.products.create({
    name: `Weekly rent — ${propertyTitle}`,
    metadata: { booking_id: booking.id, property_id: booking.property_id ?? '' },
  })

  const subscription = await stripe.subscriptions.create({
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
    billing_cycle_anchor: anchor,
    proration_behavior: 'none',
    cancel_at: cancelAt,
    metadata: {
      booking_id: booking.id,
      property_id: booking.property_id ?? '',
    },
  })

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
    return json({ error: 'Could not save booking after subscription' }, 500, origin)
  }

  const propForBond =
    booking.properties && typeof booking.properties === 'object' ? booking.properties : {}
  const bondState = typeof propForBond.state === 'string' && propForBond.state.trim() ? propForBond.state.trim() : 'NSW'
  const bondAuthority = bondAuthorityForState(bondState)
  const studentUserId = typeof sp.user_id === 'string' && sp.user_id.trim() ? sp.user_id.trim() : null
  const landlordUserId = typeof lp.user_id === 'string' && lp.user_id.trim() ? lp.user_id.trim() : null

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

  const siteBase =
    origin && origin !== '*'
      ? origin.replace(/\/$/, '')
      : (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://quni-living.vercel.app').replace(/\/$/, '')

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
      bond_amount_cents: bondCentsForEmail > 0 ? bondCentsForEmail : undefined,
      bond_authority: bondAuthority,
      dashboard_url: `${siteBase}/landlord/dashboard?tab=bookings`,
    })
    await sendEmail({ to: landlordEmail, subject: t.subject, html: t.html })
  }

  try {
    await Promise.all([sendStudent(), sendLandlord()])
  } catch (e) {
    console.error('booking confirmed emails (Resend)', e)
  }

  const leaseFlowSecret = (process.env.INTERNAL_DOC_FLOW_SECRET || '').trim()
  const generateLeaseUrl = `${internalApiOrigin()}/api/documents/generate-lease`
  if (!leaseFlowSecret) {
    console.warn(
      '[create-rent-subscription] skipping generate-lease: INTERNAL_DOC_FLOW_SECRET is not set',
    )
  } else {
    console.log('[create-rent-subscription] triggering generate-lease', {
      booking_id: booking.id,
      url: generateLeaseUrl,
    })
    // Edge runtime ends the isolate when the Response is returned; a bare void IIFE is dropped.
    // waitUntil keeps this fetch alive until it settles (Vercel request context).
    const generateLeaseTask = (async () => {
      try {
        const res = await fetch(generateLeaseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${leaseFlowSecret}`,
          },
          body: JSON.stringify({ booking_id: booking.id }),
        })
        if (!res.ok) {
          const t = await res.text()
          console.error('generate-lease failed', res.status, t)
        }
      } catch (e) {
        console.error('generate-lease trigger', e)
      }
    })()
    waitUntil(generateLeaseTask)
  }

  return json(
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
    return json({ error: msg.slice(0, 500) }, 500, origin)
  }
}
