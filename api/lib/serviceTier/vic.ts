import type { PropertyTier, ServiceTierAvailability } from './types.js'

export function vicServiceTierAvailability(propertyTier: PropertyTier): ServiceTierAvailability {
  if (propertyTier === 't1') {
    return { listing: 'available', managed: 'gated', notes: 'Managed parked pending VIC lawyer' }
  }
  if (propertyTier === 't2') {
    return { listing: 'available', managed: 'gated', notes: 'Managed gated pending VIC lawyer' }
  }
  return { listing: 'unsupported', managed: 'unsupported' }
}
