/**
 * Hourly: expire pending_confirmation bookings past expires_at; cancel uncaptured PaymentIntents.
 * Vercel Cron: GET /api/cron/expire-bookings
 * Secure with Authorization: Bearer CRON_SECRET
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '../lib/sendEmail.js'
import { bookingExpiredStudent, propertyAddressLine } from '../lib/emailTemplates.js'

export const config = { runtime: 'edge' }

export default async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!secret || token !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!stripeSecret || !supabaseUrl || !serviceRole) {
    return new Response('Server misconfigured', { status: 500 })
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const stripe = new Stripe(stripeSecret)
  const nowIso = new Date().toISOString()

  const { data: rows, error } = await admin
    .from('bookings')
    .select(
      `
      id,
      stripe_payment_intent_id,
      student_id,
      landlord_id,
      property_id,
      student_profiles ( email, full_name, first_name, last_name ),
      landlord_profiles ( email, full_name ),
      properties ( title, address, suburb, state, postcode )
    `,
    )
    .eq('status', 'pending_confirmation')
    .lt('expires_at', nowIso)

  if (error) {
    console.error('expire-bookings select', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let count = 0
  for (const b of rows ?? []) {
    const piId = b.stripe_payment_intent_id?.trim()
    if (piId) {
      try {
        const pi = await stripe.paymentIntents.retrieve(piId)
        if (pi.status === 'requires_capture' || pi.status === 'requires_confirmation') {
          await stripe.paymentIntents.cancel(piId)
        } else if (pi.status === 'succeeded') {
          await stripe.refunds.create({ payment_intent: piId })
        }
      } catch (e) {
        console.error('expire PI', piId, e)
      }
    }

    const { error: upErr } = await admin.from('bookings').update({ status: 'expired' }).eq('id', b.id)
    if (!upErr) {
      count += 1
      const prop = b.properties && typeof b.properties === 'object' ? b.properties : {}
      const addr = propertyAddressLine(prop)
      const title = 'title' in prop ? String(prop.title ?? '') : ''
      const st = b.student_profiles && typeof b.student_profiles === 'object' ? b.student_profiles : {}
      const studentEmail = 'email' in st && typeof st.email === 'string' ? st.email.trim() : ''
      const studentName =
        [st.first_name, st.last_name].filter(Boolean).join(' ').trim() ||
        ('full_name' in st ? String(st.full_name ?? '').trim() : '') ||
        'there'
      if (studentEmail) {
        try {
          const t = bookingExpiredStudent({
            student_name: studentName,
            property_address: addr || title,
            property_title: title,
          })
          await sendEmail({ to: studentEmail, subject: t.subject, html: t.html })
        } catch (e) {
          console.error('expire-bookings email', b.id, e)
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, expired: count }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
