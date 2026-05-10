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
