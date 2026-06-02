/**
 * Clear in-progress Stripe Connect onboarding so the landlord can start again
 * (e.g. wrong Individual vs Company choice in Stripe).
 *
 * POST + Authorization: Bearer <Supabase access_token>
 *
 * Blocked when payouts are fully enabled (live rent account).
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { clearedStripeConnectProfileFields } from './lib/stripeConnectLandlordAccount.js'

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

  if (!stripeSecret || !supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500, origin)
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
      return json({ error: 'Only landlord accounts can reset payout setup' }, 403, origin)
    }

    const admin = createClient(supabaseUrl, serviceRole)
    const { data: profile, error: profErr } = await admin
      .from('landlord_profiles')
      .select(
        'id, stripe_connect_account_id, stripe_charges_enabled, stripe_payouts_enabled, admin_override_verified',
      )
      .eq('user_id', user.id)
      .maybeSingle()

    if (profErr) {
      console.error('reset-stripe-connect profile select', profErr)
      return json({ error: profErr.message || 'Could not load landlord profile' }, 500, origin)
    }

    if (!profile) {
      return json({ error: 'Landlord profile not found' }, 404, origin)
    }

    if (!profile.stripe_connect_account_id) {
      return json({ ok: true, alreadyClear: true }, 200, origin)
    }

    const payoutsLive =
      profile.stripe_charges_enabled === true && profile.stripe_payouts_enabled === true

    if (payoutsLive) {
      return json(
        {
          error:
            'Rent payouts are already enabled on this account. Contact support if you need to change your business type.',
        },
        409,
        origin,
      )
    }

    const accountId = profile.stripe_connect_account_id
    const stripe = new Stripe(stripeSecret)

    let stripeDeleteWarning = null
    try {
      await stripe.accounts.del(accountId)
    } catch (delErr) {
      const msg =
        delErr && typeof delErr === 'object' && 'message' in delErr && typeof delErr.message === 'string'
          ? delErr.message
          : 'Could not delete Stripe account'
      console.warn('reset-stripe-connect stripe.accounts.del', accountId, msg)
      stripeDeleteWarning =
        'Your Quni link was cleared. Stripe may still show the old in-progress account in their dashboard.'
    }

    const { data: saved, error: upErr } = await admin
      .from('landlord_profiles')
      .update(clearedStripeConnectProfileFields(profile))
      .eq('id', profile.id)
      .select('id')
      .maybeSingle()

    if (upErr) {
      console.error('reset-stripe-connect profile update', upErr)
      return json({ error: upErr.message || 'Could not reset payout setup' }, 500, origin)
    }

    if (!saved) {
      return json({ error: 'Could not reset payout setup (no row updated)' }, 500, origin)
    }

    return json({ ok: true, stripeDeleteWarning }, 200, origin)
  } catch (e) {
    console.error('reset-stripe-connect', e)
    const msg =
      e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
        ? e.message
        : 'Unexpected server error'
    return json({ error: msg }, 500, origin)
  }
}
