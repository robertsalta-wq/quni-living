/**
 * After a student creates a booking row, notify the landlord via Resend.
 * POST JSON: { bookingId }
 * Authorization: Bearer <Supabase access_token> (student who owns the booking)
 */
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from './lib/sendEmail.js'
import { bookingRequestLandlord, propertyAddressLine } from './lib/emailTemplates.js'

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

  if (user.user_metadata?.role !== 'student') {
    return json({ error: 'Only student accounts can trigger this notification' }, 403, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)

  const { data: student, error: stErr } = await admin
    .from('student_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (stErr || !student) {
    return json({ error: 'Student profile not found' }, 404, origin)
  }

  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(
      `
      id,
      student_id,
      status,
      move_in_date,
      start_date,
      lease_length,
      student_message,
      properties (
        title,
        address,
        suburb,
        state,
        postcode
      ),
      landlord_profiles (
        email,
        full_name
      ),
      student_profiles (
        full_name,
        first_name,
        last_name,
        course,
        universities ( name )
      )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (bErr || !booking) {
    return json({ error: 'Booking not found' }, 404, origin)
  }

  if (booking.student_id !== student.id) {
    return json({ error: 'Forbidden' }, 403, origin)
  }

  if (booking.status !== 'pending_confirmation') {
    return json({ error: 'Booking is not in pending confirmation' }, 400, origin)
  }

  const lp = booking.landlord_profiles && typeof booking.landlord_profiles === 'object' ? booking.landlord_profiles : {}
  const landlordEmail = typeof lp.email === 'string' ? lp.email.trim() : ''
  if (!landlordEmail) {
    return json({ ok: true, skipped: 'no_landlord_email' }, 200, origin)
  }

  const prop = booking.properties && typeof booking.properties === 'object' ? booking.properties : {}
  const sp = booking.student_profiles && typeof booking.student_profiles === 'object' ? booking.student_profiles : {}
  const uni = sp.universities && typeof sp.universities === 'object' ? sp.universities : {}
  const uniName = 'name' in uni ? String(uni.name ?? '') : ''

  const studentName =
    [sp.first_name, sp.last_name].filter(Boolean).join(' ').trim() ||
    (typeof sp.full_name === 'string' && sp.full_name.trim()) ||
    'Student'

  const moveIn = (booking.move_in_date || booking.start_date || '').slice(0, 10)
  const addr = propertyAddressLine(prop)
  const title = 'title' in prop ? String(prop.title ?? '') : ''

  const dashboardBase =
    origin && origin !== '*' ? origin.replace(/\/$/, '') : 'https://quni-living.vercel.app'

  const tpl = bookingRequestLandlord({
    landlord_name: typeof lp.full_name === 'string' ? lp.full_name.trim() || 'Host' : 'Host',
    property_address: addr || title,
    property_title: title,
    student_name: studentName,
    student_university: uniName || '—',
    student_course: typeof sp.course === 'string' ? sp.course : '—',
    move_in_date: moveIn,
    lease_length: booking.lease_length || '—',
    student_message: typeof booking.student_message === 'string' ? booking.student_message : '',
    dashboard_url: `${dashboardBase}/landlord/bookings/${bookingId}/review`,
  })

  try {
    await sendEmail({ to: landlordEmail, subject: tpl.subject, html: tpl.html })
  } catch (e) {
    console.error('send-booking-request-email', e)
    return json({ error: e instanceof Error ? e.message : 'Failed to send email' }, 500, origin)
  }

  return json({ ok: true }, 200, origin)
}
