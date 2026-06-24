/**
 * Server mirror of src/lib/booking/landlordResponseExpiry.ts — keep in sync.
 */

export const BOOKING_LANDLORD_RESPONSE_EXPIRY_DAYS_LISTING = 7
export const BOOKING_LANDLORD_RESPONSE_EXPIRY_DAYS_MANAGED = 5

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * @param {string | null | undefined} serviceTierAtRequest
 * @returns {'listing' | 'managed'}
 */
export function resolveLandlordResponseExpiryTier(serviceTierAtRequest) {
  return serviceTierAtRequest === 'listing' ? 'listing' : 'managed'
}

/**
 * @param {'listing' | 'managed' | string | null | undefined} tier
 */
export function landlordResponseExpiryDays(tier) {
  return resolveLandlordResponseExpiryTier(tier) === 'listing'
    ? BOOKING_LANDLORD_RESPONSE_EXPIRY_DAYS_LISTING
    : BOOKING_LANDLORD_RESPONSE_EXPIRY_DAYS_MANAGED
}

/**
 * @param {'listing' | 'managed' | string | null | undefined} tier
 */
export function landlordResponseExpiryMs(tier) {
  return landlordResponseExpiryDays(tier) * MS_PER_DAY
}

/**
 * @param {'listing' | 'managed' | string | null | undefined} tier
 * @param {number} [fromMs]
 */
export function landlordResponseExpiresAtIso(tier, fromMs = Date.now()) {
  return new Date(fromMs + landlordResponseExpiryMs(tier)).toISOString()
}

/**
 * @param {'listing' | 'managed' | string | null | undefined} tier
 */
export function landlordResponseExpiryLabel(tier) {
  const days = landlordResponseExpiryDays(tier)
  return days === 1 ? '1 day' : `${days} days`
}
