import type { PropertyTier, ServiceTierAvailability } from './types.js'

const VIC_MANAGED_GATED_NOTES = 'Managed unavailable until trust account setup is complete'

export function vicServiceTierAvailability(propertyTier: PropertyTier): ServiceTierAvailability {
  if (propertyTier === 't1' || propertyTier === 't2') {
    return { listing: 'available', managed: 'gated', notes: VIC_MANAGED_GATED_NOTES }
  }
  return { listing: 'unsupported', managed: 'unsupported' }
}
