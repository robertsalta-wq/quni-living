/**
 * Stripe subscription current period end for admin subscriptions table.
 *
 * POST JSON: { bookingIds: string[] }
 * Authorization: Bearer <Supabase access_token> (platform admin)
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { requireAdminUser } from './lib/adminAuth.js'

export const config = { runtime: 'edge' }

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

  const authResult = await requireAdminUser(request, supabaseUrl, anonKey)
  if ('error' in authResult) {
    return json({ error: authResult.error }, authResult.status, origin)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400, origin)
  }

  const rawIds = Array.isArray(body.bookingIds) ? body.bookingIds : []
  const bookingIds = rawIds.filter((id) => typeof id === 'string' && id.trim()).slice(0, 50).map((id) => id.trim())
  if (bookingIds.length === 0) {
    return json({ dates: {} }, 200, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const { data: rows, error } = await admin
    .from('bookings')
    .select('id, stripe_subscription_id')
    .in('id', bookingIds)

  if (error) {
    return json({ error: error.message }, 500, origin)
  }

  const stripe = new Stripe(stripeSecret)
  const dates = {}

  await Promise.all(
    (rows ?? []).map(async (r) => {
      const sid = r.stripe_subscription_id?.trim()
      if (!sid) {
        dates[r.id] = { currentPeriodEnd: null, status: null }
        return
      }
      try {
        const sub = await stripe.subscriptions.retrieve(sid)
        dates[r.id] = {
          currentPeriodEnd: sub.current_period_end ? sub.current_period_end * 1000 : null,
          status: sub.status ?? null,
        }
      } catch (e) {
        console.error('subscription retrieve', sid, e)
        dates[r.id] = { currentPeriodEnd: null, status: 'unknown' }
      }
    }),
  )

  return json({ dates }, 200, origin)
}
