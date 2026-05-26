const DEFAULT_LISTING_FEE_CENTS = 9900

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} landlordProfileId — `properties.landlord_id` / `landlord_profiles.id`
 */
export async function isLandlordFeeExempt(admin, landlordProfileId) {
  const id = String(landlordProfileId || '').trim()
  if (!id) return false
  const { data, error } = await admin
    .from('landlord_profiles')
    .select('fee_exempt')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return Boolean(data?.fee_exempt)
}

/**
 * Student booking platform fee (cents). Returns 0 when landlord is fee-exempt — before tier/snapshot math.
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{ landlordProfileId?: string; pricingCell: object; weeklyRentCents: number; leaseWeeks?: number }} opts
 */
export async function resolvePlatformFeeCents(admin, opts) {
  const landlordProfileId = String(opts?.landlordProfileId || '').trim()
  if (landlordProfileId && (await isLandlordFeeExempt(admin, landlordProfileId))) {
    return 0
  }
  const cell = opts?.pricingCell
  const weeklyRentCents = Number(opts?.weeklyRentCents || 0)
  void opts?.leaseWeeks
  if (!cell || typeof cell !== 'object') return 0
  if (cell.student_fee_mode === 'percent') {
    const pct = Number(cell.student_fee_percent || 0)
    if (!Number.isFinite(pct) || pct <= 0) return 0
    return Math.max(0, Math.round(weeklyRentCents * (pct / 100)))
  }
  const fixed = Number(cell.student_fee_fixed_cents || 0)
  if (!Number.isFinite(fixed) || fixed <= 0) return 0
  return Math.round(fixed)
}

/**
 * Listing-tier platform fee (landlord). Zero when fee-exempt — before pricing/tier logic.
 * @param {boolean} feeExempt
 * @param {number} [fallbackCents]
 */
export function resolveListingPlatformFeeCents(feeExempt, fallbackCents = DEFAULT_LISTING_FEE_CENTS) {
  if (feeExempt) return 0
  const cents = Number(fallbackCents)
  if (!Number.isFinite(cents) || cents <= 0) return DEFAULT_LISTING_FEE_CENTS
  return Math.round(cents)
}

/**
 * Managed-tier Stripe application_fee_percent. Zero when fee-exempt — before tier logic.
 * @param {boolean} feeExempt
 * @param {{ fee_mode?: string; fee_percent?: number }} pricingCell
 */
export function resolveManagedApplicationFeePercent(feeExempt, pricingCell) {
  if (feeExempt) return 0
  if (!pricingCell || pricingCell.fee_mode !== 'percent') return 0
  const pct = Number(pricingCell.fee_percent || 0)
  return Number.isFinite(pct) && pct > 0 ? pct : 0
}
