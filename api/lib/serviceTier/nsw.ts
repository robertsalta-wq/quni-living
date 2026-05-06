import type { PropertyTier, ServiceTierAvailability } from './types.js'

export function nswServiceTierAvailability(propertyTier: PropertyTier): ServiceTierAvailability {
  if (propertyTier === 't1') {
    return { listing: 'available', managed: 'available' }
  }
  if (propertyTier === 't2') {
    return { listing: 'available', managed: 'gated', notes: 'Managed gated pending Jenny legal clearance' }
  }
  return { listing: 'unsupported', managed: 'unsupported' }
}
