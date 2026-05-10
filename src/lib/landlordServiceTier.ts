export type LandlordServiceTier = 'listing' | 'managed'

export const INTENDED_LANDLORD_SERVICE_TIER_KEY = 'quni_intended_landlord_service_tier'

export function parseLandlordServiceTier(raw: unknown): LandlordServiceTier | null {
  return raw === 'listing' || raw === 'managed' ? raw : null
}

export function landlordServiceTierTitle(tier: LandlordServiceTier | null | undefined): string {
  return tier === 'listing' ? 'Self-managed (Quni Listing)' : 'Quni Managed'
}

export function landlordServiceTierShortLabel(tier: LandlordServiceTier | null | undefined): string {
  return tier === 'listing' ? 'Self-managed' : 'Quni Managed'
}

export function landlordServiceTierDescription(tier: LandlordServiceTier | null | undefined): string {
  return tier === 'listing'
    ? 'You handle bond, rent, and day-to-day management directly with the renter.'
    : 'Quni handles rent collection and the managed tenancy workflow for this property.'
}

/**
 * One-way ratchet rule for moving a property between service tiers.
 *
 * - Same tier: always fine (no change).
 * - Listing -> Managed: always fine (manual upgrade in the form, or
 *   automatic upgrade when a Managed booking is accepted on a Listing
 *   property).
 * - Managed -> Listing: never allowed. The DB enforces this with a
 *   BEFORE UPDATE trigger; this helper is the form-side gate.
 *
 * `from` is allowed to be null/undefined because brand new listings
 * have no prior tier and are free to start as either.
 */
export function canSwitchPropertyServiceTier(
  from: LandlordServiceTier | null | undefined,
  to: LandlordServiceTier,
): boolean {
  if (!from) return true
  if (from === to) return true
  if (from === 'managed' && to === 'listing') return false
  return true
}
