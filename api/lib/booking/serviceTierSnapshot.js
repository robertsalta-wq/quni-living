/**
 * Pure tier snapshot + validation for booking commit (Edge/JS) and confirm-booking (Node).
 * Uses api/lib/serviceTier/index.ts for availability resolution.
 */
import { resolvePropertyTierFromListing } from '../pricing/index.js'
import { resolveServiceTierAvailability } from '../serviceTier/index.js'

function resolverOptions(managedGloballyEnabled, managedOverrides) {
  return {
    managedGloballyEnabled,
    managedOverrides: managedOverrides ?? undefined,
  }
}

/**
 * Snapshot for `bookings.service_tier_at_request` when the renter commits the booking.
 * Prefer the property's chosen service tier; legacy callers fall back to state availability.
 */
export function computeServiceTierAtRequestSnapshot({
  state,
  propertyType,
  isRegisteredRoomingHouse,
  moduleEnabled,
  managedGloballyEnabled,
  managedOverrides,
  propertyServiceTier,
}) {
  if (propertyServiceTier === 'listing' || propertyServiceTier === 'managed') return propertyServiceTier
  const pt = resolvePropertyTierFromListing(propertyType, isRegisteredRoomingHouse)
  const a = resolveServiceTierAvailability(
    state,
    pt,
    resolverOptions(managedGloballyEnabled, managedOverrides),
  )
  const listingOk = Boolean(moduleEnabled) && a.listing !== 'unsupported'
  const managedOk = a.managed === 'available'
  if (listingOk && managedOk) return 'managed'
  if (listingOk && !managedOk) return 'listing'
  if (!listingOk && managedOk) return 'managed'
  return null
}

/**
 * @param {string | null | undefined} bodyServiceTier
 * @param {string | null | undefined} bookingServiceTierAtRequest
 */
export function resolveEffectiveConfirmTier({
  bodyServiceTier,
  bookingServiceTierAtRequest,
  propertyServiceTier,
  state,
  propertyType,
  isRegisteredRoomingHouse,
  moduleEnabled,
  managedGloballyEnabled,
  managedOverrides,
}) {
  const raw = typeof bodyServiceTier === 'string' ? bodyServiceTier.trim().toLowerCase() : ''
  if (raw === 'listing' || raw === 'managed') return raw
  const br = bookingServiceTierAtRequest
  if (br === 'listing' || br === 'managed') return br
  const fallback = computeServiceTierAtRequestSnapshot({
    state,
    propertyType,
    isRegisteredRoomingHouse,
    moduleEnabled,
    managedGloballyEnabled,
    managedOverrides,
    propertyServiceTier,
  })
  if (fallback === 'listing' || fallback === 'managed') return fallback
  return 'managed'
}

/**
 * @returns {null | { code: string; message: string }}
 */
export function validateLandlordConfirmTierChoice(
  serviceTier,
  {
    moduleEnabled,
    managedGloballyEnabled,
    managedOverrides,
    state,
    propertyType,
    isRegisteredRoomingHouse,
    propertyServiceTier,
  },
) {
  const pt = resolvePropertyTierFromListing(propertyType, isRegisteredRoomingHouse)
  const a = resolveServiceTierAvailability(
    state,
    pt,
    resolverOptions(managedGloballyEnabled, managedOverrides),
  )
  if (serviceTier === 'listing') {
    if (propertyServiceTier === 'managed') {
      return {
        code: 'tier_not_available',
        message: 'This property is set to Quni Managed and cannot be accepted as Listing.',
      }
    }
    if (!moduleEnabled) {
      return {
        code: 'listing_module_disabled',
        message: 'Listing bookings are temporarily unavailable.',
      }
    }
    if (a.listing === 'unsupported') {
      return { code: 'tier_not_available', message: 'Listing is not available for this property.' }
    }
    return null
  }
  if (serviceTier === 'managed') {
    if (a.managed !== 'available') {
      return { code: 'tier_not_available', message: 'Managed tenancy is not available for this property.' }
    }
    return null
  }
  return { code: 'invalid_tier', message: 'Invalid service tier.' }
}

export { resolveServiceTierAvailability } from '../serviceTier/index.js'
