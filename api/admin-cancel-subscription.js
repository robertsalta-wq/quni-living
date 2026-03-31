/**
 * Cancel Stripe subscription for a booking (admin).
 *
 * POST JSON: { bookingId }
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

  const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
  if (!bookingId) {
    return json({ error: 'bookingId is required' }, 400, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, stripe_subscription_id, stripe_subscription_status')
    .eq('id', bookingId)
    .maybeSingle()

  if (bErr || !booking) {
    return json({ error: 'Booking not found' }, 404, origin)
  }

  const subId = booking.stripe_subscription_id?.trim()
  if (!subId) {
    return json({ error: 'Booking has no subscription' }, 400, origin)
  }

  const stripe = new Stripe(stripeSecret)
  const sub = await stripe.subscriptions.cancel(subId)

  const { error: upErr } = await admin
    .from('bookings')
    .update({ stripe_subscription_status: sub.status })
    .eq('id', booking.id)

  if (upErr) {
    console.error('booking after cancel sub', upErr)
  }

  return json({ ok: true, subscriptionId: sub.id, subscriptionStatus: sub.status }, 200, origin)
}
