/**
 * Landlord: platform Listing billing flags + saved card summary (Stripe Customer default PM).
 *
 * Env: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY
 *
 * GET Authorization: Bearer <Supabase access_token>
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import {
  PLATFORM_CONFIG_KEYS,
  fetchPlatformConfigValueMap,
  parseBooleanConfig,
} from './lib/platformConfig.js'

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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (request.method !== 'GET') {
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
      return json({ error: 'Only landlord accounts can load listing billing status' }, 403, origin)
    }

    const admin = createClient(supabaseUrl, serviceRole)
    const moduleMap = await fetchPlatformConfigValueMap(admin, [PLATFORM_CONFIG_KEYS.QUNI_SERVICE_TIER_MODULE_ENABLED])
    const moduleEnabled = parseBooleanConfig(moduleMap[PLATFORM_CONFIG_KEYS.QUNI_SERVICE_TIER_MODULE_ENABLED], false)

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
      return json(
        {
          moduleEnabled,
          hasPaymentMethod: false,
          card: null,
        },
        200,
        origin,
      )
    }

    const stripe = new Stripe(stripeSecret)
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ['invoice_settings.default_payment_method'],
    })

    if (customer.deleted) {
      return json({ moduleEnabled, hasPaymentMethod: false, card: null }, 200, origin)
    }

    const pm = customer.invoice_settings?.default_payment_method
    let paymentMethodId = null
    if (typeof pm === 'string') paymentMethodId = pm
    else if (pm && typeof pm === 'object' && 'id' in pm && typeof pm.id === 'string') paymentMethodId = pm.id

    if (!paymentMethodId) {
      return json({ moduleEnabled, hasPaymentMethod: false, card: null }, 200, origin)
    }

    const pmObj =
      typeof pm === 'object' && pm && 'card' in pm
        ? pm
        : await stripe.paymentMethods.retrieve(paymentMethodId)

    const card =
      pmObj &&
      typeof pmObj === 'object' &&
      'card' in pmObj &&
      pmObj.card &&
      typeof pmObj.card === 'object'
        ? pmObj.card
        : null

    const brand =
      card && 'brand' in card && typeof card.brand === 'string' ? card.brand.trim() : ''
    const last4 =
      card && 'last4' in card && typeof card.last4 === 'string' ? card.last4.trim() : ''

    const hasPaymentMethod = Boolean(brand && last4)

    return json(
      {
        moduleEnabled,
        hasPaymentMethod,
        card: hasPaymentMethod ? { brand, last4 } : null,
      },
      200,
      origin,
    )
  } catch (e) {
    console.error('landlord-listing-billing-status', e)
    const msg =
      e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
        ? e.message
        : 'Unexpected error'
    return json({ error: msg }, 500, origin)
  }
}
