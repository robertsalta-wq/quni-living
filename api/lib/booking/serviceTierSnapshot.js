/**
 * Pure tier snapshot + validation for booking commit (Edge/JS) and confirm-booking (Node).
 * Mirrors api/lib/serviceTier/index.ts — keep in sync when matrix changes.
 */
import { resolvePropertyTierFromListing } from '../pricing/index.js'

const MANAGED_COMING_SOON_NOTES = 'Quni Managed is coming soon.'

/** @param {string} stateRaw */
/** @param {'t1' | 't2' | 't3'} propertyTier */
/** @param {{ managedGloballyEnabled?: boolean }} [options] */
export function resolveServiceTierAvailability(stateRaw, propertyTier, options) {
  const normalized = String(stateRaw || '')
    .trim()
    .toUpperCase()
  const pt = propertyTier

  /** @type {{ listing: string, managed: string, notes?: string }} */
  let base
  if (normalized === 'NSW') {
    if (pt === 't1') base = { listing: 'available', managed: 'available' }
    else if (pt === 't2')
      base = {
        listing: 'available',
        managed: 'gated',
        notes: 'Managed gated pending Jenny legal clearance',
      }
    else base = { listing: 'unsupported', managed: 'unsupported' }
  } else if (normalized === 'QLD') {
    if (pt === 't1' || pt === 't2') base = { listing: 'available', managed: 'available' }
    else base = { listing: 'unsupported', managed: 'unsupported' }
  } else if (normalized === 'VIC') {
    if (pt === 't1')
      base = { listing: 'available', managed: 'gated', notes: 'Managed parked pending VIC lawyer' }
    else if (pt === 't2')
      base = { listing: 'available', managed: 'gated', notes: 'Managed gated pending VIC lawyer' }
    else base = { listing: 'unsupported', managed: 'unsupported' }
  } else {
    base = { listing: 'available', managed: 'unsupported' }
  }

  if (options?.managedGloballyEnabled === false) {
    return {
      listing: base.listing,
      managed: 'gated',
      notes: MANAGED_COMING_SOON_NOTES,
    }
  }
  return base
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
  propertyServiceTier,
}) {
  if (propertyServiceTier === 'listing' || propertyServiceTier === 'managed') return propertyServiceTier
  const pt = resolvePropertyTierFromListing(propertyType, isRegisteredRoomingHouse)
  const a = resolveServiceTierAvailability(state, pt, { managedGloballyEnabled })
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
    state,
    propertyType,
    isRegisteredRoomingHouse,
    propertyServiceTier,
  },
) {
  const pt = resolvePropertyTierFromListing(propertyType, isRegisteredRoomingHouse)
  const a = resolveServiceTierAvailability(state, pt, { managedGloballyEnabled })
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
