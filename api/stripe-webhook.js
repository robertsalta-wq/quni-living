/**
 * Stripe webhook (Vercel Serverless — Edge runtime).
 * Same behaviour as supabase/functions/stripe-webhook — no Supabase CLI required.
 *
 * Vercel env (Dashboard → Settings → Environment Variables):
 *   STRIPE_SECRET_KEY=sk_...
 *   STRIPE_WEBHOOK_SECRET=whsec_...
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... (service_role — never VITE_* or client)
 *
 * Stripe Dashboard → Webhooks → endpoint: https://YOUR_DOMAIN/api/stripe-webhook
 * Events: customer.subscription.*, account.updated, payment_intent.*, invoice.paid, invoice.payment_failed
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const config = {
  runtime: 'edge',
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!stripeSecret || !webhookSecret) {
    console.error('Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET')
    return new Response('Server misconfigured', { status: 500 })
  }

  if (!supabaseUrl || !serviceRole) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return new Response('Server misconfigured', { status: 500 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  const body = await request.text()

  const stripe = new Stripe(stripeSecret)

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed', err)
    return new Response('Bad signature', { status: 400 })
  }

  const admin = createClient(supabaseUrl, serviceRole)

  const { data: existing } = await admin.from('stripe_webhook_events').select('id').eq('id', event.id).maybeSingle()
  if (existing) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  }

  const { error: insErr } = await admin.from('stripe_webhook_events').insert({
    id: event.id,
    type: event.type,
  })
  if (insErr) {
    console.error('stripe_webhook_events insert', insErr)
    return new Response('Database error', { status: 500 })
  }

  try {
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object
        if (account?.id) {
          await admin
            .from('landlord_profiles')
            .update({
              stripe_charges_enabled: account.charges_enabled ?? false,
              stripe_payouts_enabled: account.payouts_enabled ?? false,
              stripe_connect_details_submitted: account.details_submitted ?? false,
            })
            .eq('stripe_connect_account_id', account.id)
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.created': {
        const sub = event.data.object
        await admin
          .from('bookings')
          .update({ stripe_subscription_status: sub.status })
          .eq('stripe_subscription_id', sub.id)
        break
      }
      case 'payment_intent.amount_capturable_updated': {
        const pi = event.data.object
        if (pi?.metadata?.bookingType === 'deposit' && pi.status === 'requires_capture' && pi.id) {
          await admin.from('bookings').update({ booking_fee_paid: true }).eq('stripe_payment_intent_id', pi.id)
        }
        break
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object
        if (!pi?.id) break
        if (pi.metadata?.bookingType === 'deposit') {
          await admin.from('bookings').update({ booking_fee_paid: true }).eq('stripe_payment_intent_id', pi.id)
          const { data: b } = await admin
            .from('bookings')
            .select('id, deposit_amount, platform_fee_amount')
            .eq('stripe_payment_intent_id', pi.id)
            .maybeSingle()
          if (b?.id) {
            const received = pi.amount_received ?? pi.amount ?? 0
            const dep = typeof b.deposit_amount === 'number' ? b.deposit_amount : 0
            const platform = Math.max(0, received - dep)
            await admin.from('payments').insert({
              booking_id: b.id,
              stripe_payment_intent_id: pi.id,
              amount_total: received,
              amount_platform_fee: platform,
              amount_landlord_payout: dep,
              payment_type: 'deposit',
              status: 'succeeded',
              paid_at: new Date().toISOString(),
            })
          }
        }
        break
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object
        if (pi?.id) {
          await admin
            .from('bookings')
            .update({ status: 'payment_failed' })
            .eq('stripe_payment_intent_id', pi.id)
        }
        break
      }
      case 'invoice.paid': {
        const inv = event.data.object
        const subId = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id
        if (!subId) break
        const { data: booking } = await admin
          .from('bookings')
          .select('id')
          .eq('stripe_subscription_id', subId)
          .maybeSingle()
        if (!booking?.id) break
        const total = inv.amount_paid ?? 0
        const appFee = inv.application_fee_amount ?? 0
        await admin.from('payments').insert({
          booking_id: booking.id,
          stripe_invoice_id: inv.id,
          stripe_payment_intent_id:
            typeof inv.payment_intent === 'string' ? inv.payment_intent : inv.payment_intent?.id ?? null,
          amount_total: total,
          amount_platform_fee: appFee,
          amount_landlord_payout: Math.max(0, total - appFee),
          payment_type: 'rent',
          status: 'succeeded',
          paid_at: inv.status_transitions?.paid_at
            ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
            : new Date().toISOString(),
        })
        break
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object
        const subId = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id
        if (!subId) break
        await admin
          .from('bookings')
          .update({ stripe_subscription_status: 'past_due' })
          .eq('stripe_subscription_id', subId)
        break
      }
      default:
        break
    }
  } catch (e) {
    console.error('Handler error', event.type, e)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
}
