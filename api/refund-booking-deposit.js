/**
 * Landlord declines booking: cancel uncaptured PaymentIntent or refund captured deposit.
 *
 * POST JSON: { bookingId }
 * Authorization: Bearer <Supabase access_token> (landlord)
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from './lib/sendEmail.js'
import { bookingDeclinedStudent, propertyAddressLine } from './lib/emailTemplates.js'

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

  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return json({ error: 'Missing authorization' }, 401, origin)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400, origin)
  }

  const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
  const declineReason =
    typeof body.declineReason === 'string' ? body.declineReason.trim().slice(0, 500) : ''
  if (!bookingId) {
    return json({ error: 'bookingId is required' }, 400, origin)
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey)
  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser(token)

  if (userErr || !user) {
    return json({ error: 'Invalid or expired session' }, 401, origin)
  }

  if (user.user_metadata?.role !== 'landlord') {
    return json({ error: 'Only landlord accounts can decline bookings' }, 403, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)

  const { data: landlord, error: llErr } = await admin
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (llErr || !landlord) {
    return json({ error: 'Landlord profile not found' }, 404, origin)
  }

  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(
      `
      id,
      landlord_id,
      student_id,
      status,
      notes,
      stripe_payment_intent_id,
      deposit_amount,
      weekly_rent,
      properties ( title, address, suburb, state, postcode ),
      student_profiles ( email, full_name, first_name, last_name )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (bErr || !booking) {
    return json({ error: 'Booking not found' }, 404, origin)
  }

  if (booking.landlord_id !== landlord.id) {
    return json({ error: 'Forbidden' }, 403, origin)
  }

  const declinable = booking.status === 'pending_confirmation' || booking.status === 'awaiting_info'
  if (!declinable) {
    return json({ error: 'Booking is not awaiting confirmation' }, 400, origin)
  }

  if (!booking.stripe_payment_intent_id) {
    return json({ error: 'Booking has no payment on file' }, 400, origin)
  }

  const stripe = new Stripe(stripeSecret)
  const pi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id)

  try {
    if (pi.status === 'requires_capture' || pi.status === 'requires_confirmation') {
      await stripe.paymentIntents.cancel(pi.id)
    } else if (pi.status === 'succeeded') {
      await stripe.refunds.create({ payment_intent: pi.id })
    }
  } catch (e) {
    console.error('refund/cancel PI', e)
    return json({ error: e instanceof Error ? e.message : 'Stripe error' }, 500, origin)
  }

  const nowIso = new Date().toISOString()
  const prevNotes = typeof booking.notes === 'string' ? booking.notes.trim() : ''
  const reasonLine = declineReason ? `Decline reason (${nowIso}): ${declineReason}` : ''
  const mergedNotes = [prevNotes, reasonLine].filter(Boolean).join('\n\n') || null

  const { error: upErr } = await admin
    .from('bookings')
    .update({
      status: 'declined',
      declined_at: nowIso,
      notes: mergedNotes,
      decline_reason: declineReason || null,
    })
    .eq('id', booking.id)

  if (upErr) {
    return json({ error: upErr.message || 'Could not update booking' }, 500, origin)
  }

  const propRow = booking.properties && typeof booking.properties === 'object' ? booking.properties : {}
  const addr = propertyAddressLine(propRow)
  const title =
    booking.properties && typeof booking.properties === 'object' && 'title' in booking.properties
      ? String(booking.properties.title ?? 'the property')
      : 'the property'
  const st =
    booking.student_profiles && typeof booking.student_profiles === 'object' ? booking.student_profiles : {}
  const studentEmail = typeof st.email === 'string' ? st.email.trim() : ''
  const studentName =
    [st.first_name, st.last_name].filter(Boolean).join(' ').trim() ||
    (typeof st.full_name === 'string' && st.full_name.trim()) ||
    'there'

  let depositCents = typeof booking.deposit_amount === 'number' ? booking.deposit_amount : null
  if (depositCents == null && booking.weekly_rent != null) {
    depositCents = Math.round(Number(booking.weekly_rent) * 100)
  }

  if (studentEmail) {
    try {
      const t = bookingDeclinedStudent({
        student_name: studentName,
        property_address: addr || title,
        property_title: title,
        deposit_amount_cents: depositCents ?? undefined,
      })
      await sendEmail({ to: studentEmail, subject: t.subject, html: t.html })
    } catch (e) {
      console.error('booking declined email (Resend)', e)
    }
  }

  return json({ ok: true }, 200, origin)
}
