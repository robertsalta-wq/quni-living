/**
 * Resolve the Stripe PaymentIntent id for the Listing AUD $99 fee (persisted on booking or legacy telemetry).
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} bookingId
 * @returns {Promise<string | null>}
 */
export async function fetchListingFeePaymentIntentId(admin, bookingId) {
  const { data: b, error } = await admin
    .from('bookings')
    .select('listing_fee_stripe_payment_intent_id')
    .eq('id', bookingId)
    .maybeSingle()

  if (error) {
    console.error('[listing-fee-pi] booking select', error)
    return null
  }

  const direct =
    b && typeof b.listing_fee_stripe_payment_intent_id === 'string'
      ? b.listing_fee_stripe_payment_intent_id.trim()
      : ''
  if (direct) return direct

  const { data: evs, error: evErr } = await admin
    .from('service_tier_events')
    .select('metadata')
    .eq('booking_id', bookingId)
    .eq('event_type', 'booking_confirmed')
    .eq('service_tier', 'listing')
    .order('created_at', { ascending: false })
    .limit(1)

  if (evErr) {
    console.error('[listing-fee-pi] service_tier_events select', evErr)
    return null
  }

  const meta = evs?.[0]?.metadata
  const fromMeta =
    meta && typeof meta === 'object' && meta !== null && 'stripe_payment_intent_id' in meta
      ? String(meta.stripe_payment_intent_id ?? '').trim()
      : ''
  return fromMeta || null
}

/**
 * Full refund for Listing fee PI; tolerates already-refunded PIs.
 * @param {import('stripe').default} stripe
 * @param {string | null | undefined} paymentIntentId
 * @param {string} [idempotencyKey]
 * @returns {Promise<{ refundId: string | null; refundAmountCents: number | null; alreadyRefunded?: boolean }>}
 */
export async function refundListingFeePaymentIntentFull(stripe, paymentIntentId, idempotencyKey) {
  const piId = typeof paymentIntentId === 'string' ? paymentIntentId.trim() : ''
  if (!piId) {
    return { refundId: null, refundAmountCents: null }
  }

  try {
    const reqOpts =
      typeof idempotencyKey === 'string' && idempotencyKey.trim()
        ? { idempotencyKey: idempotencyKey.trim() }
        : undefined
    const refund = await stripe.refunds.create({ payment_intent: piId }, reqOpts)
    const amt =
      typeof refund.amount === 'number' && Number.isFinite(refund.amount) ? refund.amount : null
    return { refundId: refund.id, refundAmountCents: amt }
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : ''
    const msg = e && typeof e === 'object' && 'message' in e ? String(e.message).toLowerCase() : ''
    const decline =
      code === 'charge_already_refunded' ||
      msg.includes('already been refunded') ||
      msg.includes('has already been refunded')

    if (decline) {
      return { refundId: null, refundAmountCents: 9900, alreadyRefunded: true }
    }

    console.error('[listing-fee-refund] refunds.create failed', piId, e)
    throw e
  }
}
