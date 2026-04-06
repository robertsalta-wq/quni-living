/**
 * Student booking deposit — PaymentIntent (manual capture) + optional commit (insert booking via service role).
 *
 * POST JSON (create PI): { propertyId, moveInDate, leaseLength, studentMessage?, bondAcknowledged }
 * POST JSON (commit): { commit: true, paymentIntentId, propertyId, moveInDate, leaseLength, studentMessage?, bondAcknowledged, propertyType? }
 *
 * Authorization: Bearer <Supabase access_token>
 */
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { captureSentryMessageEdge } from './lib/sentryEdgeCapture.js'

export const config = { runtime: 'edge' }

const BOOKING_FEE_AUD_CENTS = 4900

const PROPERTY_PIPELINE_STATUSES = ['pending_confirmation', 'awaiting_info', 'confirmed', 'active']
const PROPERTY_CONFIRMED_STATUSES = ['confirmed', 'active']

const VALID_PROPERTY_TYPES = new Set([
  'entire_property',
  'private_room_landlord_off_site',
  'private_room_landlord_on_site',
  'shared_room',
])

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

function leaseEndDateIso(moveIn, leaseLength) {
  if (leaseLength === 'Flexible') return null
  const days =
    leaseLength === '3 months' ? 92 : leaseLength === '6 months' ? 183 : leaseLength === '12 months' ? 365 : null
  if (days == null) return null
  return addDaysIso(moveIn, days)
}

/**
 * Exclusive end date for half-open tenancy window [start, end).
 * Prefer stored end_date; otherwise leaseEndDateIso(start, lease_length) with Flexible / null / unknown → '12 months'.
 * Cross-property overlap has no DB-level guard (unlike same-property which has a unique index). API-only enforcement
 * is acceptable for MVP. If a second booking insert path is ever added, add a DB constraint or trigger at that point.
 */
function bookingTenancyExclusiveEndIso(storedEndDate, startIso, leaseLengthRaw) {
  const trimmedEnd = typeof storedEndDate === 'string' ? storedEndDate.trim() : ''
  if (trimmedEnd) return trimmedEnd
  const ll = typeof leaseLengthRaw === 'string' ? leaseLengthRaw.trim() : ''
  const effectiveLease =
    ll === '3 months' || ll === '6 months' || ll === '12 months' ? ll : '12 months'
  return leaseEndDateIso(startIso, effectiveLease)
}

/** Half-open [start, end): overlap iff newStart < existingEnd && newEnd > existingStart. end_date is the exclusive end. */
function halfOpenDateRangesOverlap(newStart, newEnd, existingStart, existingEnd) {
  return newStart < existingEnd && newEnd > existingStart
}

function conflictPropertyAddress(propertiesRow) {
  const addr = propertiesRow && typeof propertiesRow.address === 'string' ? propertiesRow.address.trim() : ''
  if (addr) return addr
  const suburb = propertiesRow && typeof propertiesRow.suburb === 'string' ? propertiesRow.suburb.trim() : ''
  if (suburb) return suburb
  return 'another property'
}

function isUniqueViolation(err) {
  if (!err || typeof err !== 'object') return false
  const code = /** @type {{ code?: string; message?: string }} */ (err).code
  if (code === '23505') return true
  const msg = String(/** @type {{ message?: string }} */ (err).message || '')
  return /duplicate key|unique constraint/i.test(msg)
}

async function releaseAuthorisedDepositIntent(stripe, paymentIntentId, context) {
  try {
    const p = await stripe.paymentIntents.retrieve(paymentIntentId)
    if (p.status === 'requires_capture' || p.status === 'requires_confirmation') {
      await stripe.paymentIntents.cancel(paymentIntentId)
    } else if (p.status === 'succeeded') {
      await stripe.refunds.create({ payment_intent: paymentIntentId })
    }
  } catch (e) {
    console.error('releaseAuthorisedDepositIntent', context, e)
    await captureSentryMessageEdge('Failed to cancel/refund PI after commit guard failure', {
      context,
      paymentIntentId,
      err: e instanceof Error ? e.message : String(e),
    })
  }
}

async function assertPropertyAvailableForBooking(admin, propertyId, origin) {
  const { data: rows, error } = await admin
    .from('bookings')
    .select('id')
    .eq('property_id', propertyId)
    .in('status', PROPERTY_CONFIRMED_STATUSES)
    .limit(1)

  if (error) {
    console.error('assertPropertyAvailableForBooking', error)
    return json({ error: 'Server error' }, 500, origin)
  }
  if (rows?.length) {
    return json(
      {
        error: 'property_unavailable',
        message: 'This property is no longer available.',
      },
      409,
      origin,
    )
  }
  return null
}

async function assertStudentPipelineFree(admin, studentId, propertyId, origin) {
  const { data: rows, error } = await admin
    .from('bookings')
    .select('id')
    .eq('student_id', studentId)
    .eq('property_id', propertyId)
    .in('status', PROPERTY_PIPELINE_STATUSES)
    .limit(1)

  if (error) {
    console.error('assertStudentPipelineFree', error)
    return json({ error: 'Server error' }, 500, origin)
  }
  if (rows?.length) {
    return json(
      {
        error: 'duplicate_booking',
        message: 'You already have an active booking request for this property.',
      },
      409,
      origin,
    )
  }
  return null
}

/** @param {{ stripe?: import('stripe').default; paymentIntentId?: string }} [releaseOpts] Commit: cancel/refund PI if blocked. */
async function assertNoCrossPropertyDateOverlap(
  admin,
  studentId,
  propertyId,
  newMoveIn,
  newLeaseLength,
  origin,
  releaseOpts,
) {
  const newStart = typeof newMoveIn === 'string' ? newMoveIn.trim().slice(0, 10) : ''
  if (!newStart) return null

  const newEnd = bookingTenancyExclusiveEndIso(null, newStart, newLeaseLength)
  if (!newEnd) {
    console.error('assertNoCrossPropertyDateOverlap: could not compute new booking end')
    return json({ error: 'Server error' }, 500, origin)
  }

  const { data: rows, error } = await admin
    .from('bookings')
    .select(
      `
      id,
      property_id,
      move_in_date,
      start_date,
      end_date,
      lease_length,
      properties ( address, suburb )
    `,
    )
    .eq('student_id', studentId)
    .neq('property_id', propertyId)
    .in('status', PROPERTY_PIPELINE_STATUSES)

  if (error) {
    console.error('assertNoCrossPropertyDateOverlap', error)
    return json({ error: 'Server error' }, 500, origin)
  }

  for (const row of rows ?? []) {
    const exStartRaw = row.move_in_date || row.start_date
    const exStart = typeof exStartRaw === 'string' ? exStartRaw.trim().slice(0, 10) : ''
    if (!exStart) continue

    const exEnd = bookingTenancyExclusiveEndIso(row.end_date, exStart, row.lease_length)
    if (!exEnd) continue

    if (halfOpenDateRangesOverlap(newStart, newEnd, exStart, exEnd)) {
      const props = row.properties
      const property_address = conflictPropertyAddress(
        props && typeof props === 'object' ? props : null,
      )
      const body = {
        error: 'date_overlap',
        message: 'You already have a booking that overlaps with these dates.',
        conflict: {
          property_address,
          start_date: exStart,
          end_date: exEnd.slice(0, 10),
        },
      }
      if (releaseOpts?.stripe && releaseOpts?.paymentIntentId) {
        await releaseAuthorisedDepositIntent(
          releaseOpts.stripe,
          releaseOpts.paymentIntentId,
          'date_overlap_precheck',
        )
      }
      return json(body, 409, origin)
    }
  }

  return null
}

async function handlePaymentIntentCommit(request, origin, body) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()

  if (!stripeSecret || !supabaseUrl || !serviceRole || !anonKey) {
    return json({ error: 'Server misconfigured' }, 500, origin)
  }

  const paymentIntentId =
    typeof body.paymentIntentId === 'string' ? body.paymentIntentId.trim() : ''
  const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : ''
  const moveInDate = typeof body.moveInDate === 'string' ? body.moveInDate.trim() : ''
  const leaseLength = typeof body.leaseLength === 'string' ? body.leaseLength.trim() : ''
  const studentMessage = typeof body.studentMessage === 'string' ? body.studentMessage.slice(0, 4000) : ''
  const bondAcknowledged = body.bondAcknowledged === true
  const propertyTypeRaw = typeof body.propertyType === 'string' ? body.propertyType.trim() : ''
  const propertyType = VALID_PROPERTY_TYPES.has(propertyTypeRaw) ? propertyTypeRaw : 'entire_property'

  if (!paymentIntentId || !propertyId || !moveInDate || !leaseLength) {
    return json({ error: 'paymentIntentId, propertyId, moveInDate, and leaseLength are required' }, 400, origin)
  }
  if (!bondAcknowledged) {
    return json({ error: 'Bond acknowledgement is required' }, 400, origin)
  }

  const minMoveIn = addDaysIso(todayUtcIso(), 7)
  if (moveInDate < minMoveIn) {
    return json({ error: 'Move-in date must be at least 7 days from today' }, 400, origin)
  }

  const auth = request.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return json({ error: 'Missing authorization' }, 401, origin)
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
  const stripe = new Stripe(stripeSecret)

  const { data: student, error: stErr } = await admin
    .from('student_profiles')
    .select('id, user_id, email, full_name, first_name, last_name, stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (stErr || !student) {
    return json({ error: 'Student profile not found' }, 404, origin)
  }

  const block1 = await assertPropertyAvailableForBooking(admin, propertyId, origin)
  if (block1) {
    await releaseAuthorisedDepositIntent(stripe, paymentIntentId, 'property_unavailable_precheck')
    return block1
  }
  const block2 = await assertStudentPipelineFree(admin, student.id, propertyId, origin)
  if (block2) {
    await releaseAuthorisedDepositIntent(stripe, paymentIntentId, 'duplicate_booking_precheck')
    return block2
  }
  const block3 = await assertNoCrossPropertyDateOverlap(
    admin,
    student.id,
    propertyId,
    moveInDate,
    leaseLength,
    origin,
    { stripe, paymentIntentId },
  )
  if (block3) return block3

  const { data: property, error: propErr } = await admin
    .from('properties')
    .select('id, title, landlord_id, rent_per_week, status, suburb, state, property_type')
    .eq('id', propertyId)
    .maybeSingle()

  if (propErr || !property) {
    return json({ error: 'Property not found' }, 404, origin)
  }

  if (property.status !== 'active') {
    await releaseAuthorisedDepositIntent(stripe, paymentIntentId, 'property_not_active')
    return json(
      {
        error: 'property_unavailable',
        message: 'This property is no longer available.',
      },
      409,
      origin,
    )
  }

  let pi
  try {
    pi = await stripe.paymentIntents.retrieve(paymentIntentId)
  } catch (e) {
    console.error('retrieve PI commit', e)
    return json({ error: 'Invalid payment' }, 400, origin)
  }

  const meta = pi.metadata || {}
  const metaStudent = typeof meta.studentProfileId === 'string' ? meta.studentProfileId.trim() : ''
  const metaProperty = typeof meta.propertyId === 'string' ? meta.propertyId.trim() : ''
  if (metaStudent !== student.id || metaProperty !== propertyId) {
    return json({ error: 'Payment does not match this listing' }, 400, origin)
  }

  const customerOk =
    typeof student.stripe_customer_id === 'string' &&
    student.stripe_customer_id.trim() &&
    pi.customer === student.stripe_customer_id.trim()
  if (!customerOk) {
    return json({ error: 'Payment does not match your account' }, 400, origin)
  }

  if (pi.status !== 'requires_capture' && pi.status !== 'succeeded') {
    return json({ error: `Payment is not authorised (status: ${pi.status})` }, 400, origin)
  }

  const depositCents = weeklyRentCents(property.rent_per_week)
  if (depositCents == null) {
    return json({ error: 'Invalid weekly rent on listing' }, 400, origin)
  }

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  const endDate = leaseEndDateIso(moveInDate, leaseLength)

  const row = {
    property_id: property.id,
    student_id: student.id,
    landlord_id: property.landlord_id,
    start_date: moveInDate,
    move_in_date: moveInDate,
    end_date: endDate,
    weekly_rent: property.rent_per_week,
    status: 'pending_confirmation',
    notes: null,
    student_message: studentMessage.trim() || null,
    lease_length: leaseLength,
    bond_acknowledged: true,
    stripe_payment_intent_id: paymentIntentId,
    deposit_amount: depositCents,
    platform_fee_amount: BOOKING_FEE_AUD_CENTS,
    booking_fee_paid: true,
    property_type: propertyType,
    expires_at: expiresAt,
  }

  const { data: inserted, error: insErr } = await admin.from('bookings').insert(row).select('id').single()

  if (!insErr && inserted?.id) {
    return json({ ok: true, bookingId: inserted.id }, 200, origin)
  }

  if (!isUniqueViolation(insErr)) {
    console.error('booking insert', insErr)
    return json({ error: insErr?.message || 'Could not save booking' }, 500, origin)
  }

  let piAfter
  try {
    piAfter = await stripe.paymentIntents.retrieve(paymentIntentId)
  } catch (e) {
    console.error('race handler retrieve PI', e)
    piAfter = pi
  }

  const st = piAfter.status
  try {
    if (st === 'requires_capture' || st === 'requires_confirmation') {
      await stripe.paymentIntents.cancel(paymentIntentId)
    } else if (st === 'succeeded') {
      await stripe.refunds.create({ payment_intent: paymentIntentId })
    }
  } catch (stripeErr) {
    console.error('race handler stripe cleanup', stripeErr)
    await captureSentryMessageEdge('Booking race: Stripe cleanup failed after unique violation', {
      paymentIntentId,
      propertyId,
      studentId: student.id,
      piStatus: st,
      stripeErr: stripeErr instanceof Error ? stripeErr.message : String(stripeErr),
    })
  }

  await captureSentryMessageEdge('Booking insert unique violation (race)', {
    paymentIntentId,
    propertyId,
    studentId: student.id,
    supabaseMessage: insErr?.message,
    piStatusAfter: st,
  })

  return json(
    {
      error: 'race_condition',
      message:
        'Sorry, this property was just booked by another student. Your payment has been cancelled and you will not be charged.',
    },
    409,
    origin,
  )
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

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400, origin)
  }

  if (body && body.commit === true) {
    return handlePaymentIntentCommit(request, origin, body)
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

  const blockA = await assertPropertyAvailableForBooking(admin, propertyId, origin)
  if (blockA) return blockA
  const blockB = await assertStudentPipelineFree(admin, student.id, propertyId, origin)
  if (blockB) return blockB
  const blockC = await assertNoCrossPropertyDateOverlap(
    admin,
    student.id,
    propertyId,
    moveInDate,
    leaseLength,
    origin,
  )
  if (blockC) return blockC

  const { data: landlordSelf } = await admin.from('landlord_profiles').select('id').eq('user_id', user.id).maybeSingle()

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
    setup_future_usage: 'off_session',
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
      studentMessage: studentMessage ? studentMessage.slice(0, 500) : '',
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
