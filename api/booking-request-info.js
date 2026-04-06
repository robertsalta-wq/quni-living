/**
 * Landlord requests more information: append booking_messages row, set status awaiting_info, email student.
 *
 * POST JSON: { bookingId, message }
 * Authorization: Bearer <Supabase access_token> (landlord)
 */
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from './lib/sendEmail.js'
import { bookingMoreInfoFromLandlordStudent, propertyAddressLine } from './lib/emailTemplates.js'

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

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !serviceRole || !anonKey) {
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
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 8000) : ''
  if (!bookingId) {
    return json({ error: 'bookingId is required' }, 400, origin)
  }
  if (!message) {
    return json({ error: 'message is required' }, 400, origin)
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
    return json({ error: 'Only landlord accounts can request more information' }, 403, origin)
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
      status,
      stripe_payment_intent_id,
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

  const allowedFrom = booking.status === 'pending_confirmation' || booking.status === 'awaiting_info'
  if (!allowedFrom) {
    return json({ error: 'Booking cannot be moved to awaiting information in its current state' }, 400, origin)
  }

  if (!booking.stripe_payment_intent_id) {
    return json({ error: 'Booking has no payment on file' }, 400, origin)
  }

  const { error: msgErr } = await admin.from('booking_messages').insert({
    booking_id: booking.id,
    sender_id: user.id,
    sender_role: 'landlord',
    message,
  })

  if (msgErr) {
    console.error('booking-request-info insert message', msgErr)
    return json({ error: msgErr.message || 'Could not save message' }, 500, origin)
  }

  const { error: upErr } = await admin.from('bookings').update({ status: 'awaiting_info' }).eq('id', booking.id)

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

  const siteBase =
    origin && origin !== '*'
      ? origin.replace(/\/$/, '')
      : (process.env.PUBLIC_SITE_URL || process.env.SITE_URL || 'https://quni-living.vercel.app').replace(/\/$/, '')

  if (studentEmail) {
    try {
      const t = bookingMoreInfoFromLandlordStudent({
        student_name: studentName,
        property_address: addr || title,
        property_title: title,
        landlord_message: message,
        reply_url: `${siteBase}/student-profile?tab=bookings`,
      })
      await sendEmail({ to: studentEmail, subject: t.subject, html: t.html })
    } catch (e) {
      console.error('booking-request-info email', e)
    }
  }

  return json({ ok: true }, 200, origin)
}
