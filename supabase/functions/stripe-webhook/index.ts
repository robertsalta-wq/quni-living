/**
 * Stripe webhook receiver (Supabase Edge Function).
 *
 * Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
 * Set secrets: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... STRIPE_SECRET_KEY=sk_...
 *
 * Dashboard → Edge Functions → stripe-webhook → URL for Stripe Dashboard webhooks.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import Stripe from 'https://esm.sh/stripe@17.5.0?target=deno'

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const stripe = stripeSecret
  ? new Stripe(stripeSecret, {
      httpClient: Stripe.createFetchHttpClient(),
    })
  : null

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (!stripe || !webhookSecret) {
    console.error('Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET')
    return new Response('Server misconfigured', { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed', err)
    return new Response('Bad signature', { status: 400 })
  }

  if (!supabaseUrl || !serviceRole) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return new Response('Server misconfigured', { status: 500 })
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
        const account = event.data.object as Stripe.Account
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
        const sub = event.data.object as Stripe.Subscription
        await admin
          .from('bookings')
          .update({ stripe_subscription_status: sub.status })
          .eq('stripe_subscription_id', sub.id)
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
})
