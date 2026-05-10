/**
 * Hourly: expire pending_confirmation bookings past expires_at; cancel uncaptured PaymentIntents.
 * Also expires Listing `bond_pending` bookings past bond_window_expires_at (full Listing fee refund).
 * Vercel Cron: GET /api/cron/expire-bookings
 * Secure with Authorization: Bearer CRON_SECRET
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '../lib/sendEmail.js'
import { bookingExpiredStudent, propertyAddressLine } from '../lib/emailTemplates.js'
import {
  fetchListingFeePaymentIntentId,
  refundListingFeePaymentIntentFull,
} from '../lib/booking/listingFeePaymentIntent.js'
import { sendListingBondPendingExpiredEmails } from '../lib/booking/listingTransactionalEmails.js'

export const config = { runtime: 'edge' }

export default async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!secret || token !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!stripeSecret || !supabaseUrl || !serviceRole) {
    return new Response('Server misconfigured', { status: 500 })
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const stripe = new Stripe(stripeSecret)
  const nowIso = new Date().toISOString()

  const { data: rows, error } = await admin
    .from('bookings')
    .select(
      `
      id,
      stripe_payment_intent_id,
      student_id,
      landlord_id,
      property_id,
      student_profiles ( email, full_name, first_name, last_name ),
      landlord_profiles ( email, full_name ),
      properties ( title, address, suburb, state, postcode )
    `,
    )
    .in('status', ['pending_confirmation', 'awaiting_info'])
    .lt('expires_at', nowIso)

  if (error) {
    console.error('expire-bookings select', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let count = 0
  for (const b of rows ?? []) {
    const piId = b.stripe_payment_intent_id?.trim()
    if (piId) {
      try {
        const pi = await stripe.paymentIntents.retrieve(piId)
        if (pi.status === 'requires_capture' || pi.status === 'requires_confirmation') {
          await stripe.paymentIntents.cancel(piId)
        } else if (pi.status === 'succeeded') {
          await stripe.refunds.create({ payment_intent: piId })
        }
      } catch (e) {
        console.error('expire PI', piId, e)
      }
    }

    const { error: upErr } = await admin.from('bookings').update({ status: 'expired' }).eq('id', b.id)
    if (!upErr) {
      count += 1
      const prop = b.properties && typeof b.properties === 'object' ? b.properties : {}
      const addr = propertyAddressLine(prop)
      const title = 'title' in prop ? String(prop.title ?? '') : ''
      const st = b.student_profiles && typeof b.student_profiles === 'object' ? b.student_profiles : {}
      const studentEmail = 'email' in st && typeof st.email === 'string' ? st.email.trim() : ''
      const studentName =
        [st.first_name, st.last_name].filter(Boolean).join(' ').trim() ||
        ('full_name' in st ? String(st.full_name ?? '').trim() : '') ||
        'there'
      if (studentEmail) {
        try {
          const t = bookingExpiredStudent({
            student_name: studentName,
            property_address: addr || title,
            property_title: title,
          })
          await sendEmail({ to: studentEmail, subject: t.subject, html: t.html })
        } catch (e) {
          console.error('expire-bookings email', b.id, e)
        }
      }
    }
  }

  const { data: bondRows, error: bondSelErr } = await admin
    .from('bookings')
    .select(
      `
      id,
      landlord_id,
      student_id,
      property_id,
      bond_window_expires_at,
      bond_received_by_landlord_at,
      service_tier_final,
      student_profiles ( email, full_name, first_name, last_name ),
      landlord_profiles ( email, full_name ),
      properties ( title, address, suburb, state, postcode )
    `,
    )
    .eq('status', 'bond_pending')
    .eq('service_tier_final', 'listing')
    .is('bond_received_by_landlord_at', null)
    .lt('bond_window_expires_at', nowIso)

  if (bondSelErr) {
    console.error('expire-bookings bond_pending select', bondSelErr)
    return new Response(JSON.stringify({ error: bondSelErr.message }), { status: 500 })
  }

  let bondCount = 0
  for (const b of bondRows ?? []) {
    try {
      const piId = await fetchListingFeePaymentIntentId(admin, b.id)
      if (!piId) {
        console.error('expire-bookings bond_pending missing listing fee PI', b.id)
        continue
      }

      let refundId = null
      let refundAmountCents = 9900
      try {
        const r = await refundListingFeePaymentIntentFull(
          stripe,
          piId,
          `listing-expire-${b.id}`,
        )
        refundId = r.refundId
        refundAmountCents =
          typeof r.refundAmountCents === 'number' && Number.isFinite(r.refundAmountCents)
            ? r.refundAmountCents
            : 9900
      } catch (re) {
        console.error('expire-bookings bond refund', b.id, re)
        continue
      }

      const { error: upBondErr } = await admin
        .from('bookings')
        .update({ status: 'expired', expired_at: nowIso })
        .eq('id', b.id)
        .eq('status', 'bond_pending')

      if (upBondErr) {
        console.error('expire-bookings bond_pending update', b.id, upBondErr)
        continue
      }

      bondCount += 1

      const { error: evErr } = await admin.from('service_tier_events').insert({
        booking_id: b.id,
        property_id: b.property_id,
        landlord_id: b.landlord_id,
        student_id: b.student_id,
        event_type: 'bond_pending_expired',
        service_tier: 'listing',
        metadata: {
          reason: 'bond_window_elapsed',
          refund_id: refundId,
          refund_amount_cents: refundAmountCents,
          stripe_payment_intent_id: piId,
        },
      })

      if (evErr) {
        console.error('expire-bookings bond_pending telemetry', b.id, evErr)
      }

      try {
        await sendListingBondPendingExpiredEmails(admin, b, {
          refund_id: refundId,
          refund_amount_cents: refundAmountCents,
        })
      } catch (emErr) {
        console.error('expire-bookings bond_pending email', b.id, emErr)
      }
    } catch (loopErr) {
      console.error('expire-bookings bond_pending row', b?.id, loopErr)
    }
  }

  return new Response(
    JSON.stringify({ ok: true, expired: count, bond_pending_expired: bondCount }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}
