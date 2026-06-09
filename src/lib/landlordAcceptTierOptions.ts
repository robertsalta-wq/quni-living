import type { ManagedOverridesMap, ResolveServiceTierOptions } from './serviceTier'
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
  /**
   * Listing → Managed upgrade at accept requires a student deposit PI to capture.
   * Listing apply no longer creates one; hide upgrade until async re-authorization exists.
   */
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
  managedGloballyEnabled?: boolean
  managedOverrides?: ManagedOverridesMap
  propertyServiceTier: string | null | undefined
  /** When false, Managed upgrade at accept is hidden (no student deposit authorization on file). */
  studentDepositAuthorized?: boolean
}): LandlordAcceptTierUiModel {
  const propertyServiceTier = parseLandlordServiceTier(args.propertyServiceTier) ?? 'listing'
  const propertyTier = resolvePropertyTierFromListing(
    args.propertyType,
    args.isRegisteredRoomingHouse,
  ) as PropertyTier
  const resolverOptions: ResolveServiceTierOptions = {
    managedGloballyEnabled: args.managedGloballyEnabled,
    managedOverrides: args.managedOverrides,
  }
  const avail = resolveServiceTierAvailability(
    String(args.state ?? '').trim(),
    propertyTier,
    resolverOptions,
  )
  const showListing =
    propertyServiceTier === 'listing' && args.moduleEnabled === true && avail.listing !== 'unsupported'
  const showManaged = avail.managed === 'available'
  const depositReadyForManagedUpgrade = args.studentDepositAuthorized === true
  // Proper fix: async student deposit re-authorization before Managed upgrade at accept (deferred).
  const showManagedUpgrade =
    propertyServiceTier === 'listing' && showManaged && depositReadyForManagedUpgrade

  const defaultTier: LandlordAcceptChoice =
    propertyServiceTier === 'listing' && showListing ? 'listing' : showManaged ? 'managed' : 'listing'

  return { showListing, showManaged, defaultTier, propertyTier, propertyServiceTier, showManagedUpgrade }
}
