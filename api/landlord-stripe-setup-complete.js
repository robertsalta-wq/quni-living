/**
 * After Stripe.js confirmSetup - attach succeeded SetupIntent payment method as Customer default (off_session).
 *
 * POST JSON: { setupIntentId: string }
 * Authorization: Bearer <Supabase access_token>
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const config = {
  runtime: 'edge',
}

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

  const missingEnv = [
    !stripeSecret && 'STRIPE_SECRET_KEY',
    !supabaseUrl && 'SUPABASE_URL',
    !serviceRole && 'SUPABASE_SERVICE_ROLE_KEY',
    !anonKey && 'SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean)

  if (missingEnv.length > 0) {
    return json({ error: `Missing env: ${missingEnv.join(', ')}` }, 500, origin)
  }

  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return json({ error: 'Missing authorization' }, 401, origin)
  }

  let bodyJson = {}
  try {
    bodyJson = await request.json()
  } catch {
    bodyJson = {}
  }
  const setupIntentId =
    typeof bodyJson.setupIntentId === 'string'
      ? bodyJson.setupIntentId.trim()
      : typeof bodyJson.setup_intent_id === 'string'
        ? bodyJson.setup_intent_id.trim()
        : ''

  if (!setupIntentId || !setupIntentId.startsWith('seti_')) {
    return json({ error: 'setupIntentId (seti_…) is required' }, 400, origin)
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
      return json({ error: 'Only landlord accounts can complete listing billing setup' }, 403, origin)
    }

    const admin = createClient(supabaseUrl, serviceRole)
    const { data: profile, error: profErr } = await admin
      .from('landlord_profiles')
      .select('id, stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profErr) {
      console.error('landlord_profiles select', profErr)
      return json({ error: profErr.message || 'Could not load landlord profile' }, 500, origin)
    }

    if (!profile) {
      return json({ error: 'Landlord profile not found' }, 404, origin)
    }

    const customerId = profile.stripe_customer_id?.trim() || null
    if (!customerId) {
      return json({ error: 'Stripe customer not found for landlord' }, 400, origin)
    }

    const stripe = new Stripe(stripeSecret)
    const si = await stripe.setupIntents.retrieve(setupIntentId)

    if (si.status !== 'succeeded') {
      return json({ error: 'Setup is not complete yet. Finish entering your card details.' }, 400, origin)
    }

    const siCustomer = typeof si.customer === 'string' ? si.customer : si.customer?.id
    if (siCustomer !== customerId) {
      return json({ error: 'Setup does not match your billing profile' }, 400, origin)
    }

    const pmRaw = si.payment_method
    const paymentMethodId =
      typeof pmRaw === 'string' ? pmRaw : pmRaw && typeof pmRaw === 'object' && 'id' in pmRaw ? pmRaw.id : null

    if (!paymentMethodId || !paymentMethodId.startsWith('pm_')) {
      return json({ error: 'No payment method on SetupIntent' }, 400, origin)
    }

    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    })

    return json({ ok: true }, 200, origin)
  } catch (e) {
    console.error('landlord-stripe-setup-complete', e)
    const msg =
      e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
        ? e.message
        : 'Unexpected error'
    return json({ error: msg }, 500, origin)
  }
}
