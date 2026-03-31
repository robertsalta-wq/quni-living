/**
 * Admin refund: Stripe refund + update payments row.
 *
 * POST JSON: { paymentIntentId, amountCents?, reason, notes? }
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
  const { user } = authResult

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400, origin)
  }

  const paymentIntentId = typeof body.paymentIntentId === 'string' ? body.paymentIntentId.trim() : ''
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 4000) : ''
  const amountCents =
    body.amountCents != null && body.amountCents !== ''
      ? Math.round(Number(body.amountCents))
      : null

  if (!paymentIntentId) {
    return json({ error: 'paymentIntentId is required' }, 400, origin)
  }
  if (!reason) {
    return json({ error: 'reason is required' }, 400, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const { data: payRows, error: payErr } = await admin
    .from('payments')
    .select('id, stripe_payment_intent_id, status, amount_total')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .limit(1)

  const payRow = payRows?.[0]
  if (payErr || !payRow?.id) {
    return json({ error: 'Payment record not found for this Payment Intent' }, 404, origin)
  }

  if (payRow.status === 'refunded') {
    return json({ error: 'This payment is already marked refunded' }, 400, origin)
  }

  const stripe = new Stripe(stripeSecret)
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
  const maxRefundable = typeof pi.amount_received === 'number' ? pi.amount_received : pi.amount || 0
  const refundAmount =
    amountCents != null && Number.isFinite(amountCents) && amountCents > 0
      ? Math.min(amountCents, maxRefundable)
      : maxRefundable

  if (refundAmount <= 0) {
    return json({ error: 'Nothing to refund' }, 400, origin)
  }

  const refundParams = { payment_intent: paymentIntentId, amount: refundAmount }
  const refund = await stripe.refunds.create(refundParams)

  const nowIso = new Date().toISOString()
  const { error: upErr } = await admin
    .from('payments')
    .update({
      status: 'refunded',
      refund_reason: reason,
      refund_notes: notes || null,
      refund_amount_cents: refundAmount,
      refunded_at: nowIso,
      refunded_by_admin_user_id: user.id,
      stripe_refund_id: refund.id,
    })
    .eq('id', payRow.id)

  if (upErr) {
    console.error('payments refund update', upErr)
    return json({ error: 'Refund processed in Stripe but database update failed' }, 500, origin)
  }

  return json(
    {
      ok: true,
      stripeRefundId: refund.id,
      amountRefundedCents: refundAmount,
    },
    200,
    origin,
  )
}
