import { nswServiceTierAvailability } from './nsw.js'
import { qldServiceTierAvailability } from './qld.js'
import { vicServiceTierAvailability } from './vic.js'
import type { PropertyTier, ServiceTierAvailability, ServiceTierResolverState } from './types.js'

export type {
  PropertyTier,
  ServiceTierAvailability,
  ServiceTierAvailabilityStatus,
  ServiceTierResolverState,
} from './types.js'

export function resolveServiceTierAvailability(
  state: string,
  propertyTier: PropertyTier,
): ServiceTierAvailability {
  const normalized = state.trim().toUpperCase() as ServiceTierResolverState
  if (normalized === 'NSW') return nswServiceTierAvailability(propertyTier)
  if (normalized === 'QLD') return qldServiceTierAvailability(propertyTier)
  if (normalized === 'VIC') return vicServiceTierAvailability(propertyTier)
  return { listing: 'unsupported', managed: 'unsupported' }
}
