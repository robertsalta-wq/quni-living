/** Landlord must accept/decline a pending booking request within this window (from apply commit). */
export const BOOKING_LANDLORD_RESPONSE_EXPIRY_DAYS_LISTING = 7
export const BOOKING_LANDLORD_RESPONSE_EXPIRY_DAYS_MANAGED = 5

export type LandlordResponseExpiryTier = 'listing' | 'managed'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function resolveLandlordResponseExpiryTier(
  serviceTierAtRequest: string | null | undefined,
): LandlordResponseExpiryTier {
  return serviceTierAtRequest === 'listing' ? 'listing' : 'managed'
}

export function landlordResponseExpiryDays(
  tier: LandlordResponseExpiryTier | string | null | undefined,
): number {
  return resolveLandlordResponseExpiryTier(tier) === 'listing'
    ? BOOKING_LANDLORD_RESPONSE_EXPIRY_DAYS_LISTING
    : BOOKING_LANDLORD_RESPONSE_EXPIRY_DAYS_MANAGED
}

export function landlordResponseExpiryMs(
  tier: LandlordResponseExpiryTier | string | null | undefined,
): number {
  return landlordResponseExpiryDays(tier) * MS_PER_DAY
}

export function landlordResponseExpiresAtIso(
  tier: LandlordResponseExpiryTier | string | null | undefined,
  fromMs: number = Date.now(),
): string {
  return new Date(fromMs + landlordResponseExpiryMs(tier)).toISOString()
}

/** User-facing duration label, e.g. "5 days" or "7 days". */
export function landlordResponseExpiryLabel(
  tier: LandlordResponseExpiryTier | string | null | undefined,
): string {
  const days = landlordResponseExpiryDays(tier)
  return days === 1 ? '1 day' : `${days} days`
}
