/**

 * Stripe webhook (Vercel Serverless — Node.js runtime).

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

  api: { bodyParser: false },

  runtime: 'nodejs',

}



/** Vercel may set `req.body` when buffered; otherwise read the stream (raw string for Stripe).

 * If `req.body` is a parsed object, never JSON.stringify it for verification — the signature is over the exact raw bytes.

 * Empty string / empty Buffer on `req.body` is ignored so we still read the stream (a real Stripe payload is never empty). */

async function readRawBody(req) {

  const b = req.body

  if (Buffer.isBuffer(b) && b.length > 0) {

    return b.toString('utf8')

  }

  if (typeof b === 'string' && b.length > 0) {

    return b

  }

  // Empty string / empty Buffer: fall through — real payload may still be on the stream (Vercel).
  // Non-Buffer objects (parsed JSON): never use — do not JSON.stringify (breaks key order vs signature).

  return await new Promise((resolve, reject) => {

    const chunks = []

    req.on('data', (c) => chunks.push(c))

    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))

    req.on('error', reject)

  })

}



export default async function handler(req, res) {

  if (req.method !== 'POST') {

    return res.status(405).end('Method not allowed')

  }



  const stripeSecret = process.env.STRIPE_SECRET_KEY

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  const supabaseUrl = process.env.SUPABASE_URL

  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY



  if (!stripeSecret || !webhookSecret) {

    console.error('Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET')

    return res.status(500).end('Server misconfigured')

  }



  if (!supabaseUrl || !serviceRole) {

    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

    return res.status(500).end('Server misconfigured')

  }



  const sig = req.headers['stripe-signature']

  const signature = Array.isArray(sig) ? sig[0] : sig

  if (!signature) {

    return res.status(400).end('No signature')

  }



  const rawBody = await readRawBody(req)



  const stripe = new Stripe(stripeSecret)



  let event

  try {

    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)

  } catch (err) {

    console.error('Webhook signature verification failed', err)

    return res.status(400).end('Bad signature')

  }



  const admin = createClient(supabaseUrl, serviceRole)



  const { data: existing } = await admin.from('stripe_webhook_events').select('id').eq('id', event.id).maybeSingle()

  if (existing) {

    return res.status(200).json({ received: true, duplicate: true })

  }



  const { error: insErr } = await admin.from('stripe_webhook_events').insert({

    id: event.id,

    type: event.type,

  })

  if (insErr) {

    console.error('stripe_webhook_events insert', insErr)

    return res.status(500).end('Database error')

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



  return res.status(200).json({ received: true })

}


