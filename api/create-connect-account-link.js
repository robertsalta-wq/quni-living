/**
 * Stripe Connect Express — create account (if needed) + Account Link for onboarding.
 *
 * Vercel env:
 *   STRIPE_SECRET_KEY=sk_...
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and anon key for JWT verify: SUPABASE_ANON_KEY
 *   or VITE_SUPABASE_ANON_KEY (Vercel often only has the latter — both work)
 * Optional: SITE_URL or PUBLIC_SITE_URL = https://your-domain.com (otherwise uses request URL origin)
 *
 * POST with header: Authorization: Bearer <Supabase access_token>
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

  let returnPath = '/landlord/dashboard?stripe_connect=return'
  let refreshPath = '/landlord/dashboard?stripe_connect=refresh'
  try {
    const text = await request.text()
    if (text.trim()) {
      const body = JSON.parse(text)
      if (body?.returnContext === 'landlord_onboarding') {
        returnPath = '/onboarding/landlord?stripe_connect=success'
        refreshPath = '/onboarding/landlord?stripe_connect=refresh'
      }
    }
  } catch {
    /* invalid body — use dashboard defaults */
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
    console.error('create-connect-account-link missing env:', missingEnv.join(', '))
    return json(
      {
        error: `Add in Vercel → Settings → Environment Variables (then Redeploy): ${missingEnv.join(', ')}. Use your Supabase publishable/anon key (same value as in the app).`,
      },
      500,
      origin,
    )
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
      return json({ error: 'Only landlord accounts can connect payouts' }, 403, origin)
    }

    const admin = createClient(supabaseUrl, serviceRole)
    const { data: profile, error: profErr } = await admin
      .from('landlord_profiles')
      .select(
        'id, user_id, email, stripe_connect_account_id, stripe_charges_enabled, stripe_payouts_enabled',
      )
      .eq('user_id', user.id)
      .maybeSingle()

    if (profErr) {
      console.error('landlord_profiles select', profErr)
      return json(
        {
          error:
            profErr.message ||
            'Could not load landlord profile. If you just added Stripe columns, run stripe_connect_foundation.sql in Supabase.',
        },
        500,
        origin,
      )
    }

    if (!profile) {
      return json({ error: 'Landlord profile not found' }, 404, origin)
    }

    const alreadyConnected = profile.stripe_charges_enabled === true && profile.stripe_payouts_enabled === true

    const stripe = new Stripe(stripeSecret)

    let accountId = profile.stripe_connect_account_id

    if (!accountId) {
      const email =
        typeof profile.email === 'string' && profile.email.includes('@') ? profile.email : undefined
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'AU',
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          landlord_profile_id: profile.id,
          supabase_user_id: user.id,
        },
      })
      accountId = account.id

      const { data: saved, error: upErr } = await admin
        .from('landlord_profiles')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', profile.id)
        .select('stripe_connect_account_id')
        .maybeSingle()

      if (upErr) {
        console.error('landlord_profiles stripe_connect_account_id update', upErr)
        return json(
          {
            error: upErr.message || 'Could not save Connect account id to database.',
          },
          500,
          origin,
        )
      }

      if (!saved || saved.stripe_connect_account_id !== accountId) {
        console.error('landlord_profiles update returned no row — wrong service key or RLS?', {
          profileId: profile.id,
        })
        return json(
          {
            error:
              'Could not save Stripe account to your landlord profile (no row updated). This usually means Vercel SUPABASE_SERVICE_ROLE_KEY is not the service_role secret.',
            hint:
              'Supabase → Project Settings → API → copy service_role (secret), paste as SUPABASE_SERVICE_ROLE_KEY in Vercel. It is different from VITE_SUPABASE_ANON_KEY. Redeploy, then try again.',
          },
          500,
          origin,
        )
      }
    }

    const reqUrl = new URL(request.url)
    const siteOrigin = (
      process.env.SITE_URL ||
      process.env.PUBLIC_SITE_URL ||
      `${reqUrl.protocol}//${reqUrl.host}`
    ).replace(/\/$/, '')

    const desiredType = alreadyConnected ? 'account_update' : 'account_onboarding'

    // Stripe may not allow `account_update` for all accounts/states; if it fails,
    // fall back to `account_onboarding` so we still return a hosted URL.
    let accountLink
    try {
      accountLink = await stripe.accountLinks.create({
        account: accountId,
        type: desiredType,
        refresh_url: `${siteOrigin}${refreshPath}`,
        return_url: `${siteOrigin}${returnPath}`,
      })
    } catch (linkErr) {
      if (desiredType === 'account_update') {
        accountLink = await stripe.accountLinks.create({
          account: accountId,
          type: 'account_onboarding',
          refresh_url: `${siteOrigin}${refreshPath}`,
          return_url: `${siteOrigin}${returnPath}`,
        })
      } else {
        throw linkErr
      }
    }

    return json({ url: accountLink.url, alreadyConnected }, 200, origin)
  } catch (e) {
    console.error('create-connect-account-link', e)
    const msg =
      e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
        ? e.message
        : 'Unexpected server error'
    const raw =
      e && typeof e === 'object' && 'raw' in e && e.raw && typeof e.raw === 'object'
        ? /** @type {{ message?: string }} */ (e.raw).message
        : undefined
    return json(
      {
        error: raw || msg,
        hint:
          typeof msg === 'string' && msg.toLowerCase().includes('connect')
            ? 'Stripe Dashboard → Connect → enable Connect for your platform (test mode is fine).'
            : undefined,
      },
      500,
      origin,
    )
  }
}
