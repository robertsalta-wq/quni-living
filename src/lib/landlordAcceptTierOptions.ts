import { resolvePropertyTierFromListing } from './pricing'
import { resolveServiceTierAvailability, type PropertyTier } from './serviceTier'

export type LandlordAcceptChoice = 'listing' | 'managed'

export type LandlordAcceptTierUiModel = {
  showListing: boolean
  showManaged: boolean
  /** Preferred default when both tiers appear (Managed + Most popular). */
  defaultTier: LandlordAcceptChoice
  propertyTier: PropertyTier
}

/**
 * Landlord booking review: which service tiers to offer and the default selection.
 * Listing is hidden when the listing module is off or Listing is unsupported for the state.
 * Managed is hidden unless availability is exactly `available` (not gated/unsupported).
 */
export function landlordAcceptTierUiModel(args: {
  state: string | null | undefined
  propertyType: string | null | undefined
  isRegisteredRoomingHouse: boolean | null | undefined
  moduleEnabled: boolean
}): LandlordAcceptTierUiModel {
  const propertyTier = resolvePropertyTierFromListing(
    args.propertyType,
    args.isRegisteredRoomingHouse,
  ) as PropertyTier
  const avail = resolveServiceTierAvailability(String(args.state ?? '').trim(), propertyTier)
  const showListing = args.moduleEnabled === true && avail.listing !== 'unsupported'
  const showManaged = avail.managed === 'available'

  const defaultTier: LandlordAcceptChoice = showListing && !showManaged ? 'listing' : 'managed'

  return { showListing, showManaged, defaultTier, propertyTier }
}
