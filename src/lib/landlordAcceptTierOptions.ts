import { resolvePropertyTierFromListing } from './pricing'
import { resolveServiceTierAvailability, type PropertyTier } from './serviceTier'
import { parseLandlordServiceTier, type LandlordServiceTier } from './landlordServiceTier'

export type LandlordAcceptChoice = 'listing' | 'managed'

export type LandlordAcceptTierUiModel = {
  showListing: boolean
  showManaged: boolean
  /** Preferred default follows the property's chosen tier. */
  defaultTier: LandlordAcceptChoice
  propertyTier: PropertyTier
  propertyServiceTier: LandlordServiceTier
  showManagedUpgrade: boolean
}

/**
 * Landlord booking review: follow the property's service tier.
 * Listing properties default to Listing and may show a Managed upgrade; Managed properties never show Listing.
 */
export function landlordAcceptTierUiModel(args: {
  state: string | null | undefined
  propertyType: string | null | undefined
  isRegisteredRoomingHouse: boolean | null | undefined
  moduleEnabled: boolean
  propertyServiceTier: string | null | undefined
}): LandlordAcceptTierUiModel {
  const propertyServiceTier = parseLandlordServiceTier(args.propertyServiceTier) ?? 'managed'
  const propertyTier = resolvePropertyTierFromListing(
    args.propertyType,
    args.isRegisteredRoomingHouse,
  ) as PropertyTier
  const avail = resolveServiceTierAvailability(String(args.state ?? '').trim(), propertyTier)
  const showListing =
    propertyServiceTier === 'listing' && args.moduleEnabled === true && avail.listing !== 'unsupported'
  const showManaged = avail.managed === 'available'
  const showManagedUpgrade = propertyServiceTier === 'listing' && showManaged

  const defaultTier: LandlordAcceptChoice = propertyServiceTier === 'listing' && showListing ? 'listing' : 'managed'

  return { showListing, showManaged, defaultTier, propertyTier, propertyServiceTier, showManagedUpgrade }
}
