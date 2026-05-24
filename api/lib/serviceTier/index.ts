import { nswServiceTierAvailability } from './nsw.js'
import { qldServiceTierAvailability } from './qld.js'
import { vicServiceTierAvailability } from './vic.js'
import type {
  PropertyTier,
  ResolveServiceTierOptions,
  ServiceTierAvailability,
  ServiceTierResolverState,
} from './types.js'

export type {
  PropertyTier,
  ResolveServiceTierOptions,
  ServiceTierAvailability,
  ServiceTierAvailabilityStatus,
  ServiceTierResolverState,
} from './types.js'

const MANAGED_COMING_SOON_NOTES = 'Quni Managed is coming soon.'

function applyManagedGlobalGate(
  availability: ServiceTierAvailability,
  options?: ResolveServiceTierOptions,
): ServiceTierAvailability {
  if (options?.managedGloballyEnabled === false) {
    return {
      listing: availability.listing,
      managed: 'gated',
      notes: MANAGED_COMING_SOON_NOTES,
    }
  }
  return availability
}

export function resolveServiceTierAvailability(
  state: string,
  propertyTier: PropertyTier,
  options?: ResolveServiceTierOptions,
): ServiceTierAvailability {
  const normalized = state.trim().toUpperCase() as ServiceTierResolverState
  let base: ServiceTierAvailability
  if (normalized === 'NSW') base = nswServiceTierAvailability(propertyTier)
  else if (normalized === 'QLD') base = qldServiceTierAvailability(propertyTier)
  else if (normalized === 'VIC') base = vicServiceTierAvailability(propertyTier)
  else base = { listing: 'available', managed: 'unsupported' }
  return applyManagedGlobalGate(base, options)
}
