/**
 * Student booking deposit — PaymentIntent (manual capture: no charge until landlord confirms).
 * Funds settle on the platform account; deposit is transferred to the landlord on release cron.
 *
 * POST JSON: { propertyId, moveInDate, leaseLength, studentMessage?, bondAcknowledged }
 * Authorization: Bearer <Supabase access_token>
 *
 * Env: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY
 *
 * Landlord "new booking request" notifications use Resend from POST /api/send-booking-request-email
 * after the client inserts the booking row (not from this handler).
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

const BOOKING_FEE_AUD_CENTS = 4900

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

function weeklyRentCents(rentPerWeek) {
  const n = Number(rentPerWeek)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

function addDaysIso(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d) + days * 86400000
  const x = new Date(t)
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`
}

function todayUtcIso() {
  return new Date().toISOString().slice(0, 10)
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

  const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : ''
  const moveInDate = typeof body.moveInDate === 'string' ? body.moveInDate.trim() : ''
  const leaseLength = typeof body.leaseLength === 'string' ? body.leaseLength.trim() : ''
  const studentMessage = typeof body.studentMessage === 'string' ? body.studentMessage.slice(0, 4000) : ''
  const bondAcknowledged = body.bondAcknowledged === true

  if (!propertyId || !moveInDate || !leaseLength) {
    return json({ error: 'propertyId, moveInDate, and leaseLength are required' }, 400, origin)
  }
  if (!bondAcknowledged) {
    return json({ error: 'Bond acknowledgement is required' }, 400, origin)
  }

  const minMoveIn = addDaysIso(todayUtcIso(), 7)
  if (moveInDate < minMoveIn) {
    return json({ error: 'Move-in date must be at least 7 days from today' }, 400, origin)
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
    return json({ error: 'Only student accounts can book' }, 403, origin)
  }

  const admin = createClient(supabaseUrl, serviceRole)

  const { data: student, error: stErr } = await admin
    .from('student_profiles')
    .select('id, user_id, email, full_name, first_name, last_name, stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (stErr || !student) {
    return json({ error: 'Student profile not found' }, 404, origin)
  }

  const { data: landlordSelf } = await admin
    .from('landlord_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: property, error: propErr } = await admin
    .from('properties')
    .select(
      `
      id,
      title,
      landlord_id,
      rent_per_week,
      status,
      suburb,
      state,
      property_type,
      landlord_profiles (
        id,
        stripe_connect_account_id,
        stripe_charges_enabled,
        email,
        full_name
      )
    `,
    )
    .eq('id', propertyId)
    .maybeSingle()

  if (propErr || !property) {
    return json({ error: 'Property not found' }, 404, origin)
  }

  if (property.status !== 'active') {
    return json({ error: 'This listing is not available for booking' }, 400, origin)
  }

  if (!property.landlord_id) {
    return json({ error: 'This listing has no host on file' }, 400, origin)
  }

  if (landlordSelf?.id && landlordSelf.id === property.landlord_id) {
    return json({ error: 'You cannot book your own listing' }, 400, origin)
  }

  const lp = property.landlord_profiles
  if (!lp?.stripe_connect_account_id || !lp.stripe_charges_enabled) {
    return json(
      {
        error: 'stripe_not_ready',
        message:
          'This host has not finished connecting their payout account yet. Try again once they have linked their bank in Stripe.',
      },
      400,
      origin,
    )
  }

  const depositCents = weeklyRentCents(property.rent_per_week)
  if (depositCents == null) {
    return json({ error: 'Invalid weekly rent on listing' }, 400, origin)
  }

  const amountCents = depositCents + BOOKING_FEE_AUD_CENTS

  const stripe = new Stripe(stripeSecret)

  let customerId = student.stripe_customer_id?.trim() || null
  if (!customerId) {
    const email =
      (typeof student.email === 'string' && student.email.includes('@') && student.email) ||
      (typeof user.email === 'string' && user.email) ||
      undefined
    const name =
      (typeof student.full_name === 'string' && student.full_name.trim()) ||
      [student.first_name, student.last_name].filter(Boolean).join(' ').trim() ||
      undefined

    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: {
        student_profile_id: student.id,
        supabase_user_id: user.id,
      },
    })
    customerId = customer.id
    await admin.from('student_profiles').update({ stripe_customer_id: customerId }).eq('id', student.id)
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'aud',
    capture_method: 'manual',
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    metadata: {
      bookingType: 'deposit',
      propertyId: property.id,
      studentProfileId: student.id,
      landlordProfileId: property.landlord_id,
      moveInDate,
      leaseLength,
      depositCents: String(depositCents),
      bookingFeeCents: String(BOOKING_FEE_AUD_CENTS),
    },
  })

  return json(
    {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amountCents,
      depositCents,
      bookingFeeCents: BOOKING_FEE_AUD_CENTS,
    },
    200,
    origin,
  )
}
