/**
 * Pull Stripe Connect account status into landlord_profiles (webhook backup).
 * POST + Authorization: Bearer <access_token>
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
      return json({ error: 'Only landlord accounts can sync payout status' }, 403, origin)
    }

    const admin = createClient(supabaseUrl, serviceRole)
    const { data: profile, error: profErr } = await admin
      .from('landlord_profiles')
      .select('id, stripe_connect_account_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profErr || !profile?.stripe_connect_account_id) {
      return json({ error: 'No Stripe Connect account on file yet. Use Connect your bank account first.' }, 400, origin)
    }

    const stripe = new Stripe(stripeSecret)
    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id)

    const { data: saved, error: upErr } = await admin
      .from('landlord_profiles')
      .update({
        stripe_charges_enabled: account.charges_enabled ?? false,
        stripe_payouts_enabled: account.payouts_enabled ?? false,
        stripe_connect_details_submitted: account.details_submitted ?? false,
      })
      .eq('id', profile.id)
      .select('stripe_charges_enabled')
      .maybeSingle()

    if (upErr) {
      console.error('sync-stripe-connect-status update', upErr)
      return json({ error: upErr.message || 'Could not update profile' }, 500, origin)
    }

    if (!saved) {
      return json(
        {
          error:
            'Update did not apply (0 rows). Check Vercel SUPABASE_SERVICE_ROLE_KEY is the service_role JWT from Supabase API settings, not the anon key.',
        },
        500,
        origin,
      )
    }

    return json(
      {
        ok: true,
        stripe_charges_enabled: account.charges_enabled ?? false,
        stripe_payouts_enabled: account.payouts_enabled ?? false,
        stripe_connect_details_submitted: account.details_submitted ?? false,
      },
      200,
      origin,
    )
  } catch (e) {
    console.error('sync-stripe-connect-status', e)
    const msg =
      e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
        ? e.message
        : 'Unexpected error'
    return json({ error: msg }, 500, origin)
  }
}
