import type { PropertyTier, ServiceTierAvailability } from './types.js'

export function qldServiceTierAvailability(propertyTier: PropertyTier): ServiceTierAvailability {
  if (propertyTier === 't1' || propertyTier === 't2') {
    return { listing: 'available', managed: 'available' }
  }
  return { listing: 'unsupported', managed: 'unsupported' }
}
