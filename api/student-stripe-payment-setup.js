/**
 * Student: ensure Stripe Customer + Checkout Session (setup mode) to save a card for future rent.
 *
 * Env: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY
 * Optional: SITE_URL / PUBLIC_SITE_URL
 *
 * POST Authorization: Bearer <Supabase access_token>
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

  try {
    const supabaseAuth = createClient(supabaseUrl, anonKey)
    const {
      data: { user },
      error: userErr,
    } = await supabaseAuth.auth.getUser(token)

    if (userErr || !user) {
      return json({ error: 'Invalid or expired session' }, 401, origin)
    }

    if (user.user_metadata?.role !== 'student') {
      return json({ error: 'Only student accounts can set up rent billing' }, 403, origin)
    }

    const admin = createClient(supabaseUrl, serviceRole)
    const { data: profile, error: profErr } = await admin
      .from('student_profiles')
      .select('id, user_id, email, full_name, first_name, last_name, stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profErr) {
      console.error('student_profiles select', profErr)
      return json({ error: profErr.message || 'Could not load student profile' }, 500, origin)
    }

    if (!profile) {
      return json({ error: 'Student profile not found' }, 404, origin)
    }

    const stripe = new Stripe(stripeSecret)

    let customerId = profile.stripe_customer_id?.trim() || null

    if (!customerId) {
      const email =
        (typeof profile.email === 'string' && profile.email.includes('@') && profile.email) ||
        (typeof user.email === 'string' && user.email) ||
        undefined
      const name =
        (typeof profile.full_name === 'string' && profile.full_name.trim()) ||
        [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() ||
        undefined

      const customer = await stripe.customers.create({
        email,
        name: name || undefined,
        metadata: {
          student_profile_id: profile.id,
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id

      const { data: saved, error: upErr } = await admin
        .from('student_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', profile.id)
        .select('stripe_customer_id')
        .maybeSingle()

      if (upErr) {
        console.error('student_profiles stripe_customer_id update', upErr)
        return json({ error: upErr.message || 'Could not save Stripe customer id' }, 500, origin)
      }

      if (!saved || saved.stripe_customer_id !== customerId) {
        return json(
          {
            error:
              'Could not save Stripe customer (no row updated). Check Vercel SUPABASE_SERVICE_ROLE_KEY is the service_role secret.',
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

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId,
      payment_method_types: ['card'],
      success_url: `${siteOrigin}/student-profile?stripe_setup=success`,
      cancel_url: `${siteOrigin}/student-profile?stripe_setup=cancel`,
      metadata: {
        student_profile_id: profile.id,
        supabase_user_id: user.id,
      },
    })

    if (!session.url) {
      return json({ error: 'Stripe did not return a checkout URL' }, 500, origin)
    }

    return json({ url: session.url }, 200, origin)
  } catch (e) {
    console.error('student-stripe-payment-setup', e)
    const msg =
      e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
        ? e.message
        : 'Unexpected error'
    return json({ error: msg }, 500, origin)
  }
}
