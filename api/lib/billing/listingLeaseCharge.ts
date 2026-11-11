import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../src/lib/database.types.js'
import {
  addCalendarMonths,
  amountsAfterCredit,
  quoteForLeaseLength,
  quoteForMonths,
  unusedWholeMonths,
  type LeaseChargeQuote,
} from '../../../src/lib/pricing/leaseCharge.js'
import { isLandlordFeeExempt } from '../pricing/resolvePlatformFee.js'
import { sendEmail } from '../sendEmail.js'
import { buildLeaseTaxInvoicePdf } from './leaseChargeInvoice.js'

type Admin = SupabaseClient<Database>
type ChargeKind = Database['public']['Tables']['listing_lease_charges']['Row']['kind']

const RETRY_MS = 24 * 60 * 60 * 1000

function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

function plusRetry(now = new Date()): string {
  return new Date(now.getTime() + RETRY_MS).toISOString()
}

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  return new Stripe(key)
}

function bookingRef(id: string): string {
  return id.slice(0, 8)
}

/**
 * True when a lease fee has failed its retry. A missing table does not block accepts.
 */
export async function landlordHasUnpaidLeaseCharge(admin: Admin, landlordId: string): Promise<boolean> {
  const { data, error } = await admin
    .from('listing_lease_charges')
    .select('id')
    .eq('landlord_id', landlordId)
    .eq('status', 'failed')
    .gte('attempt_count', 2)
    .limit(1)

  if (error) {
    console.error('[lease-charge] unpaid lookup', error)
    return false
  }
  return (data ?? []).length > 0
}

type LoadedBooking = {
  id: string
  landlord_id: string
  property_id: string
  lease_length: string | null
  start_date: string
  move_in_date: string | null
  end_date: string | null
  status: string
  service_tier_final: string | null
  termination_effective_date: string | null
  roomLine: string
  landlordEmail: string
  stripeCustomerId: string
  feeExempt: boolean
}

async function loadBookingForCharge(admin: Admin, bookingId: string): Promise<LoadedBooking | null> {
  const { data, error } = await admin
    .from('bookings')
    .select(
      `
      id, landlord_id, property_id, lease_length, start_date, move_in_date, end_date, status,
      service_tier_final, termination_effective_date,
      properties ( title, address, suburb, state )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (error || !data?.landlord_id || !data.property_id) {
    if (error) console.error('[lease-charge] load booking', error)
    return null
  }

  const { data: landlord, error: llErr } = await admin
    .from('landlord_profiles')
    .select('email, stripe_customer_id, fee_exempt')
    .eq('id', data.landlord_id)
    .maybeSingle()
  if (llErr) console.error('[lease-charge] load landlord', llErr)

  const prop = data.properties as
    | { title?: string | null; address?: string | null; suburb?: string | null; state?: string | null }
    | { title?: string | null; address?: string | null; suburb?: string | null; state?: string | null }[]
    | null
  const property = Array.isArray(prop) ? prop[0] : prop
  const roomLine =
    [property?.title, property?.address, property?.suburb, property?.state].filter(Boolean).join(', ') ||
    'Room'

  return {
    id: data.id,
    landlord_id: data.landlord_id,
    property_id: data.property_id,
    lease_length: data.lease_length,
    start_date: data.start_date,
    move_in_date: data.move_in_date,
    end_date: data.end_date,
    status: data.status,
    service_tier_final: data.service_tier_final,
    termination_effective_date: data.termination_effective_date,
    roomLine,
    landlordEmail: landlord?.email?.trim() || '',
    stripeCustomerId: landlord?.stripe_customer_id?.trim() || '',
    feeExempt: Boolean(landlord?.fee_exempt),
  }
}

async function restoreCreditMonths(admin: Admin, propertyId: string, months: number): Promise<void> {
  if (months <= 0) return
  const { data, error } = await admin
    .from('property_lease_credits')
    .select('months_remaining')
    .eq('property_id', propertyId)
    .maybeSingle()
  if (error || !data) {
    console.error('[lease-charge] restore credit read', error)
    return
  }
  const { error: upErr } = await admin
    .from('property_lease_credits')
    .update({ months_remaining: data.months_remaining + months, updated_at: new Date().toISOString() })
    .eq('property_id', propertyId)
  if (upErr) console.error('[lease-charge] restore credit', upErr)
}

async function defaultPaymentMethodId(stripe: Stripe, customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ['invoice_settings.default_payment_method'],
    })
    if (customer.deleted) return null
    const pm = customer.invoice_settings?.default_payment_method
    if (typeof pm === 'string') return pm
    if (pm && typeof pm === 'object' && 'id' in pm && typeof pm.id === 'string') return pm.id
    return null
  } catch (e) {
    console.error('[lease-charge] customer', e)
    return null
  }
}

async function emailInvoice(args: {
  admin: Admin
  booking: LoadedBooking
  chargeId: string
  pdf: Uint8Array
  totalCents: number
  repeatsEveryThreeMonths?: boolean
}): Promise<void> {
  if (!args.booking.landlordEmail) return
  const path = `lease-invoices/${args.booking.id}/${args.chargeId}.pdf`
  const { error: upErr } = await args.admin.storage.from('tenancy-documents').upload(path, args.pdf, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (upErr) {
    console.error('[lease-charge] invoice upload', upErr)
  } else {
    await args.admin
      .from('listing_lease_charges')
      .update({ invoice_storage_path: path })
      .eq('id', args.chargeId)
  }

  const repeatLine = args.repeatsEveryThreeMonths
    ? '<p>This charge repeats every 3 months until the tenancy ends.</p>'
    : ''
  const html = `<h2 style="color:#1A1A2E;">Tax invoice</h2>
<p>Your Quni Listing lease fee invoice is attached.</p>
${repeatLine}
<p><strong>Room:</strong> ${escapeHtml(args.booking.roomLine)}</p>
<p><strong>Booking:</strong> ${escapeHtml(bookingRef(args.booking.id))}</p>
<p><strong>Total (incl. GST):</strong> ${escapeHtml((args.totalCents / 100).toFixed(2))} AUD</p>
<p>A copy is also in your booking on the landlord dashboard.</p>`

  await sendEmail({
    to: args.booking.landlordEmail,
    subject: `Tax invoice - ${args.booking.roomLine}`,
    html,
    attachments: [
      {
        filename: `quni-tax-invoice-${bookingRef(args.booking.id)}.pdf`,
        content: bytesToBase64(args.pdf),
      },
    ],
  })
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function chargeRepeatsEveryThreeMonths(kind: ChargeKind): boolean {
  return kind === 'flexible_quarter' || kind === 'rollover_quarter'
}

async function issueInvoice(admin: Admin, booking: LoadedBooking, chargeId: string, row: {
  months: number
  credit_months: number
  ex_gst_cents: number
  gst_cents: number
  total_cents: number
  kind: ChargeKind
}): Promise<void> {
  const repeatsEveryThreeMonths = chargeRepeatsEveryThreeMonths(row.kind)
  const pdf = await buildLeaseTaxInvoicePdf({
    invoiceDateIso: todayIso(),
    bookingReference: bookingRef(booking.id),
    roomLine: booking.roomLine.slice(0, 180),
    months: row.months,
    creditMonths: row.credit_months,
    exGstCents: row.ex_gst_cents,
    gstCents: row.gst_cents,
    totalCents: row.total_cents,
    repeatsEveryThreeMonths,
  })
  await emailInvoice({ admin, booking, chargeId, pdf, totalCents: row.total_cents, repeatsEveryThreeMonths })
}

async function collectStripe(args: {
  admin: Admin
  stripe: Stripe | null
  booking: LoadedBooking
  chargeId: string
  chargedCents: number
  attempt: number
}): Promise<'succeeded' | 'failed'> {
  if (args.chargedCents <= 0) {
    await args.admin
      .from('listing_lease_charges')
      .update({
        status: 'succeeded',
        charged_at: new Date().toISOString(),
        attempt_count: args.attempt,
        next_retry_at: null,
        failure_reason: null,
      })
      .eq('id', args.chargeId)
    return 'succeeded'
  }

  if (!args.stripe) {
    await args.admin
      .from('listing_lease_charges')
      .update({
        status: 'failed',
        failure_reason: 'stripe_not_configured',
        attempt_count: args.attempt,
        next_retry_at: args.attempt >= 2 ? null : plusRetry(),
      })
      .eq('id', args.chargeId)
    return 'failed'
  }

  const pmId = args.booking.stripeCustomerId
    ? await defaultPaymentMethodId(args.stripe, args.booking.stripeCustomerId)
    : null

  if (!args.booking.stripeCustomerId || !pmId) {
    await args.admin
      .from('listing_lease_charges')
      .update({
        status: 'failed',
        failure_reason: 'no_payment_method',
        attempt_count: args.attempt,
        next_retry_at: args.attempt >= 2 ? null : plusRetry(),
      })
      .eq('id', args.chargeId)
    return 'failed'
  }

  try {
    const pi = await args.stripe.paymentIntents.create(
      {
        amount: args.chargedCents,
        currency: 'aud',
        customer: args.booking.stripeCustomerId,
        payment_method: pmId,
        off_session: true,
        confirm: true,
        description: `Quni Listing lease fee - booking ${bookingRef(args.booking.id)}`,
        metadata: {
          booking_id: args.booking.id,
          charge_id: args.chargeId,
          landlord_id: args.booking.landlord_id,
        },
      },
      { idempotencyKey: `lease-charge-${args.chargeId}-a${args.attempt}` },
    )
    if (pi.status !== 'succeeded') {
      await args.admin
        .from('listing_lease_charges')
        .update({
          status: 'failed',
          stripe_payment_intent_id: pi.id,
          failure_reason: `status:${pi.status}`,
          attempt_count: args.attempt,
          next_retry_at: args.attempt >= 2 ? null : plusRetry(),
        })
        .eq('id', args.chargeId)
      return 'failed'
    }
    await args.admin
      .from('listing_lease_charges')
      .update({
        status: 'succeeded',
        stripe_payment_intent_id: pi.id,
        charged_at: new Date().toISOString(),
        attempt_count: args.attempt,
        next_retry_at: null,
        failure_reason: null,
      })
      .eq('id', args.chargeId)
    return 'succeeded'
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 500) : 'charge_failed'
    console.error('[lease-charge] stripe', args.chargeId, e)
    await args.admin
      .from('listing_lease_charges')
      .update({
        status: 'failed',
        failure_reason: message,
        attempt_count: args.attempt,
        next_retry_at: args.attempt >= 2 ? null : plusRetry(),
      })
      .eq('id', args.chargeId)
    return 'failed'
  }
}

async function insertOpeningCharge(args: {
  admin: Admin
  booking: LoadedBooking
  kind: ChargeKind
  periodStart: string
  periodEnd: string | null
  quote: LeaseChargeQuote
}): Promise<string | null> {
  const { data: consumed, error: creditErr } = await args.admin.rpc('consume_property_lease_months', {
    p_property_id: args.booking.property_id,
    p_months: args.quote.months,
  })
  if (creditErr) {
    console.error('[lease-charge] consume credit', creditErr)
    return null
  }
  const creditMonths = typeof consumed === 'number' ? consumed : 0
  const amounts = amountsAfterCredit(args.quote.months, creditMonths)

  const { data: inserted, error } = await args.admin
    .from('listing_lease_charges')
    .insert({
      booking_id: args.booking.id,
      property_id: args.booking.property_id,
      landlord_id: args.booking.landlord_id,
      kind: args.kind,
      period_start: args.periodStart,
      period_end: args.periodEnd,
      months: args.quote.months,
      ex_gst_cents: amounts.exGstCents,
      gst_cents: amounts.gstCents,
      total_cents: amounts.chargedCents,
      credit_months: amounts.creditMonths,
      charged_cents: amounts.chargedCents,
      status: 'pending',
      attempt_count: 0,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    console.error('[lease-charge] insert', error)
    await restoreCreditMonths(args.admin, args.booking.property_id, creditMonths)
    return null
  }

  if (creditMonths > 0) {
    await args.admin.from('property_lease_credit_events').insert({
      property_id: args.booking.property_id,
      booking_id: args.booking.id,
      charge_id: inserted.id,
      months_delta: -creditMonths,
      reason: 'applied_to_charge',
    })
  }

  return inserted.id
}

function tenancyStillOpen(booking: LoadedBooking, periodStart: string): boolean {
  if (['cancelled', 'declined', 'expired', 'terminated', 'completed'].includes(booking.status)) return false
  const ended = booking.termination_effective_date?.slice(0, 10)
  if (ended && ended <= periodStart) return false
  return true
}

/**
 * Charge once when everyone required has signed. A card failure does not unwind the lease.
 */
export async function chargeListingLeaseOnSigned(admin: Admin, bookingId: string): Promise<void> {
  try {
    const booking = await loadBookingForCharge(admin, bookingId)
    if (!booking) return
    if (booking.service_tier_final && booking.service_tier_final !== 'listing') return
    if (!tenancyStillOpen(booking, todayIso())) return

    const quote = quoteForLeaseLength(booking.lease_length)
    if (!quote) {
      console.error('[lease-charge] unknown lease length', booking.id, booking.lease_length)
      return
    }

    const kind: ChargeKind = quote.kind === 'flexible' ? 'flexible_quarter' : 'fixed_term'
    const { data: existing, error: existErr } = await admin
      .from('listing_lease_charges')
      .select('id')
      .eq('booking_id', booking.id)
      .eq('kind', kind)
      .limit(1)
    if (existErr) {
      console.error('[lease-charge] existing', existErr)
      return
    }
    if ((existing ?? []).length > 0) return

    const feeExempt = booking.feeExempt || (await isLandlordFeeExempt(admin, booking.landlord_id))
    const periodStart =
      quote.kind === 'flexible'
        ? todayIso()
        : (booking.move_in_date || booking.start_date).slice(0, 10)
    const periodEnd =
      quote.kind === 'flexible'
        ? addCalendarMonths(periodStart, 3)
        : booking.end_date?.slice(0, 10) || addCalendarMonths(periodStart, quote.months)

    if (feeExempt) {
      await admin.from('listing_lease_charges').insert({
        booking_id: booking.id,
        property_id: booking.property_id,
        landlord_id: booking.landlord_id,
        kind,
        period_start: periodStart,
        period_end: periodEnd,
        months: quote.months,
        ex_gst_cents: 0,
        gst_cents: 0,
        total_cents: 0,
        credit_months: 0,
        charged_cents: 0,
        status: 'exempt',
        charged_at: new Date().toISOString(),
      })
      return
    }

    const chargeId = await insertOpeningCharge({ admin, booking, kind, periodStart, periodEnd, quote })
    if (!chargeId) return

    const { data: row } = await admin
      .from('listing_lease_charges')
      .select('months, credit_months, ex_gst_cents, gst_cents, total_cents, charged_cents, kind')
      .eq('id', chargeId)
      .single()
    if (!row) return

    const stripe = stripeClient()
    if (row.charged_cents > 0 && !stripe) {
      await admin
        .from('listing_lease_charges')
        .update({
          status: 'failed',
          failure_reason: 'stripe_not_configured',
          attempt_count: 1,
          next_retry_at: plusRetry(),
        })
        .eq('id', chargeId)
      return
    }

    const outcome = await collectStripe({
      admin,
      stripe,
      booking,
      chargeId,
      chargedCents: row.charged_cents,
      attempt: 1,
    })

    if (outcome === 'succeeded') {
      await issueInvoice(admin, booking, chargeId, {
        months: row.months,
        credit_months: row.credit_months,
        ex_gst_cents: row.ex_gst_cents,
        gst_cents: row.gst_cents,
        total_cents: row.total_cents,
        kind: row.kind,
      })
    }
  } catch (e) {
    console.error('[lease-charge] signed', bookingId, e)
  }
}

const STUCK_PENDING_MS = 30 * 60 * 1000

type PendingChargeRow = {
  id: string
  booking_id: string
  charged_cents: number
  attempt_count: number
  stripe_payment_intent_id: string | null
}

/**
 * A pending row older than 30 minutes means the process died after insert.
 * Look up Stripe before creating anything. A search failure is not treated as "no charge".
 */
async function findExistingLeasePaymentIntent(
  stripe: Stripe,
  row: PendingChargeRow,
): Promise<Stripe.PaymentIntent | 'unknown' | null> {
  if (row.stripe_payment_intent_id) {
    try {
      return await stripe.paymentIntents.retrieve(row.stripe_payment_intent_id)
    } catch (e) {
      console.error('[lease-charge] retrieve pending', row.id, e)
      return 'unknown'
    }
  }
  try {
    const found = await stripe.paymentIntents.search({
      query: `metadata['charge_id']:'${row.id}'`,
      limit: 5,
    })
    const succeeded = found.data.find((pi) => pi.status === 'succeeded')
    return succeeded ?? found.data[0] ?? null
  } catch (e) {
    console.error('[lease-charge] search pending', row.id, e)
    return 'unknown'
  }
}

async function markChargeSucceeded(
  admin: Admin,
  booking: LoadedBooking,
  chargeId: string,
  paymentIntentId: string | null,
  attempt: number,
): Promise<void> {
  await admin
    .from('listing_lease_charges')
    .update({
      status: 'succeeded',
      stripe_payment_intent_id: paymentIntentId,
      charged_at: new Date().toISOString(),
      attempt_count: attempt,
      next_retry_at: null,
      failure_reason: null,
    })
    .eq('id', chargeId)
  const { data: fresh } = await admin
    .from('listing_lease_charges')
    .select('months, credit_months, ex_gst_cents, gst_cents, total_cents, kind')
    .eq('id', chargeId)
    .single()
  if (fresh) await issueInvoice(admin, booking, chargeId, fresh)
}

/**
 * Recover rows left pending because the process died before Stripe answered.
 * Never creates a second PaymentIntent when Stripe already has one for this charge.
 */
export async function settleStuckPendingLeaseCharges(
  admin: Admin,
  now = new Date(),
): Promise<{ settled: number }> {
  const stripe = stripeClient()
  if (!stripe) return { settled: 0 }
  const cutoff = new Date(now.getTime() - STUCK_PENDING_MS).toISOString()
  const { data, error } = await admin
    .from('listing_lease_charges')
    .select('id, booking_id, charged_cents, attempt_count, stripe_payment_intent_id')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .limit(50)
  if (error || !data) {
    if (error) console.error('[lease-charge] pending list', error)
    return { settled: 0 }
  }

  let settled = 0
  for (const row of data as PendingChargeRow[]) {
    const booking = await loadBookingForCharge(admin, row.booking_id)
    if (!booking) continue
    const existing = await findExistingLeasePaymentIntent(stripe, row)
    if (existing === 'unknown') continue

    if (existing?.status === 'succeeded') {
      await markChargeSucceeded(admin, booking, row.id, existing.id, Math.max(1, row.attempt_count || 1))
      settled += 1
      continue
    }

    if (existing && (existing.status === 'processing' || existing.status === 'requires_capture')) {
      if (!row.stripe_payment_intent_id) {
        await admin
          .from('listing_lease_charges')
          .update({ stripe_payment_intent_id: existing.id })
          .eq('id', row.id)
      }
      continue
    }

    const alreadyTried = Boolean(existing)
    const attempt = alreadyTried ? Math.max(2, row.attempt_count + 1) : Math.max(1, row.attempt_count || 1)
    if (attempt > 2) {
      await admin
        .from('listing_lease_charges')
        .update({
          status: 'failed',
          stripe_payment_intent_id: existing?.id ?? row.stripe_payment_intent_id,
          failure_reason: existing ? `status:${existing.status}` : 'stuck_pending',
          attempt_count: attempt,
          next_retry_at: null,
        })
        .eq('id', row.id)
      settled += 1
      continue
    }

    settled += 1
    const outcome = await collectStripe({
      admin,
      stripe,
      booking,
      chargeId: row.id,
      chargedCents: row.charged_cents,
      attempt,
    })
    if (outcome === 'succeeded') {
      const { data: fresh } = await admin
        .from('listing_lease_charges')
        .select('months, credit_months, ex_gst_cents, gst_cents, total_cents, kind')
        .eq('id', row.id)
        .single()
      if (fresh) await issueInvoice(admin, booking, row.id, fresh)
    }
  }
  return { settled }
}

/** One retry. A second failure leaves the row failed so new accepts are blocked. */
export async function retryDueLeaseCharges(admin: Admin, now = new Date()): Promise<{ retried: number }> {
  const stripe = stripeClient()
  if (!stripe) return { retried: 0 }
  const { data, error } = await admin
    .from('listing_lease_charges')
    .select('id, booking_id, charged_cents, attempt_count')
    .eq('status', 'failed')
    .lt('attempt_count', 2)
    .lte('next_retry_at', now.toISOString())
    .limit(50)
  if (error || !data) {
    if (error) console.error('[lease-charge] retry list', error)
    return { retried: 0 }
  }

  let retried = 0
  for (const row of data) {
    const booking = await loadBookingForCharge(admin, row.booking_id)
    if (!booking) continue
    retried += 1
    const outcome = await collectStripe({
      admin,
      stripe,
      booking,
      chargeId: row.id,
      chargedCents: row.charged_cents,
      attempt: Math.max(2, row.attempt_count + 1),
    })
    if (outcome === 'succeeded') {
      const { data: fresh } = await admin
        .from('listing_lease_charges')
        .select('months, credit_months, ex_gst_cents, gst_cents, total_cents, kind')
        .eq('id', row.id)
        .single()
      if (fresh) await issueInvoice(admin, booking, row.id, fresh)
    }
  }
  return { retried }
}

async function chargeQuarter(admin: Admin, booking: LoadedBooking, kind: ChargeKind, periodStart: string): Promise<boolean> {
  if (!tenancyStillOpen(booking, periodStart)) return false
  const quote = quoteForMonths(3, 'flexible')
  const periodEnd = addCalendarMonths(periodStart, 3)
  const { data: existing } = await admin
    .from('listing_lease_charges')
    .select('id')
    .eq('booking_id', booking.id)
    .eq('kind', kind)
    .eq('period_start', periodStart)
    .limit(1)
  if ((existing ?? []).length > 0) return false

  if (booking.feeExempt) {
    await admin.from('listing_lease_charges').insert({
      booking_id: booking.id,
      property_id: booking.property_id,
      landlord_id: booking.landlord_id,
      kind,
      period_start: periodStart,
      period_end: periodEnd,
      months: 3,
      ex_gst_cents: 0,
      gst_cents: 0,
      total_cents: 0,
      credit_months: 0,
      charged_cents: 0,
      status: 'exempt',
      charged_at: new Date().toISOString(),
    })
    return true
  }

  const chargeId = await insertOpeningCharge({ admin, booking, kind, periodStart, periodEnd, quote })
  if (!chargeId) return false
  const stripe = stripeClient()
  const { data: row } = await admin
    .from('listing_lease_charges')
    .select('months, credit_months, ex_gst_cents, gst_cents, total_cents, charged_cents, kind')
    .eq('id', chargeId)
    .single()
  if (!row) return false
  if (!stripe && row.charged_cents > 0) {
    await admin
      .from('listing_lease_charges')
      .update({
        status: 'failed',
        failure_reason: 'stripe_not_configured',
        attempt_count: 1,
        next_retry_at: plusRetry(),
      })
      .eq('id', chargeId)
    return true
  }
  const outcome = await collectStripe({
    admin,
    stripe,
    booking,
    chargeId,
    chargedCents: row.charged_cents,
    attempt: 1,
  })
  if (outcome === 'succeeded') await issueInvoice(admin, booking, chargeId, row)
  return true
}

/** Flexible quarters, and fixed leases that continue after their end date. */
export async function chargeDueLeaseQuarters(admin: Admin, now = new Date()): Promise<{ opened: number }> {
  const today = todayIso(now)
  const { data, error } = await admin
    .from('bookings')
    .select('id, lease_length, end_date, status, service_tier_final')
    .eq('service_tier_final', 'listing')
    .in('status', ['active', 'confirmed'])
    .limit(200)
  if (error || !data) {
    if (error) console.error('[lease-charge] quarter list', error)
    return { opened: 0 }
  }

  let opened = 0
  for (const row of data) {
    const booking = await loadBookingForCharge(admin, row.id)
    if (!booking) continue
    const quote = quoteForLeaseLength(booking.lease_length)
    if (!quote) continue

    if (quote.kind === 'flexible') {
      const { data: latest } = await admin
        .from('listing_lease_charges')
        .select('period_end, period_start')
        .eq('booking_id', booking.id)
        .eq('kind', 'flexible_quarter')
        .order('period_start', { ascending: false })
        .limit(1)
      const end = latest?.[0]?.period_end
      if (!end || end > today) continue
      const started = await chargeQuarter(admin, booking, 'flexible_quarter', end)
      if (started) opened += 1
      continue
    }

    const leaseEnd = booking.end_date?.slice(0, 10)
    if (!leaseEnd || leaseEnd > today) continue
    const { data: latestRollover } = await admin
      .from('listing_lease_charges')
      .select('period_end, period_start')
      .eq('booking_id', booking.id)
      .eq('kind', 'rollover_quarter')
      .order('period_start', { ascending: false })
      .limit(1)
    const nextStart = latestRollover?.[0]?.period_end || leaseEnd
    if (nextStart > today) continue
    const started = await chargeQuarter(admin, booking, 'rollover_quarter', nextStart)
    if (started) opened += 1
  }
  return { opened }
}

export type EarlyEndResult =
  | { ok: true; creditMonths: number; monthsRemaining: number; alreadyRecorded: boolean }
  | { ok: false; status: number; error: string }

export async function recordEarlyLeaseEnd(
  admin: Admin,
  args: { bookingId: string; landlordId: string; endedOn: string },
): Promise<EarlyEndResult> {
  const endedOn = args.endedOn.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endedOn)) {
    return { ok: false, status: 400, error: 'Enter the date the lease ended.' }
  }
  if (endedOn > todayIso()) {
    return { ok: false, status: 400, error: 'The end date cannot be in the future.' }
  }

  const booking = await loadBookingForCharge(admin, args.bookingId)
  if (!booking || booking.landlord_id !== args.landlordId) {
    return { ok: false, status: 404, error: 'Booking not found.' }
  }
  const start = (booking.move_in_date || booking.start_date).slice(0, 10)
  if (endedOn < start) {
    return { ok: false, status: 400, error: 'The end date is before the lease started.' }
  }

  const { data: prior } = await admin
    .from('property_lease_credit_events')
    .select('id, months_delta, early_end_date')
    .eq('booking_id', booking.id)
    .eq('reason', 'early_end')
    .maybeSingle()
  if (prior) {
    const { data: bal } = await admin
      .from('property_lease_credits')
      .select('months_remaining')
      .eq('property_id', booking.property_id)
      .maybeSingle()
    return {
      ok: true,
      creditMonths: prior.months_delta,
      monthsRemaining: bal?.months_remaining ?? prior.months_delta,
      alreadyRecorded: true,
    }
  }

  const { data: charges } = await admin
    .from('listing_lease_charges')
    .select('months, credit_months, period_start, period_end, status, kind')
    .eq('booking_id', booking.id)
    .in('status', ['succeeded', 'exempt'])

  let creditMonths = 0
  const covering = (charges ?? []).filter((c) => {
    const ps = c.period_start.slice(0, 10)
    const pe = c.period_end?.slice(0, 10)
    return ps <= endedOn && (!pe || endedOn < pe)
  })
  const pool = covering.length > 0 ? covering : charges ?? []
  for (const charge of pool) {
    const billed = charge.months + charge.credit_months
    creditMonths += unusedWholeMonths(billed, charge.period_start, endedOn)
  }

  const { data: balance, error } = await admin.rpc('grant_property_lease_months', {
    p_property_id: booking.property_id,
    p_booking_id: booking.id,
    p_months: creditMonths,
    p_early_end_date: endedOn,
  })
  if (error) {
    console.error('[lease-charge] grant', error)
    return { ok: false, status: 500, error: 'Could not record the early end. Try again.' }
  }

  if (!booking.termination_effective_date) {
    await admin
      .from('bookings')
      .update({
        termination_effective_date: endedOn,
        termination_type: 'tenant_notice',
      })
      .eq('id', booking.id)
      .is('termination_effective_date', null)
  }

  return {
    ok: true,
    creditMonths,
    monthsRemaining: typeof balance === 'number' ? balance : creditMonths,
    alreadyRecorded: false,
  }
}
