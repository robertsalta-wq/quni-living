import type { PropertyTier, ServiceTierAvailability } from './types.js'

/** Managed stays off until trust accounts and Victorian licensing / legal clearance are in place. */
const VIC_MANAGED_GATED_NOTES =
  'Managed unavailable until trust accounts are operational and Victorian licensing requirements are satisfied'

export function vicServiceTierAvailability(propertyTier: PropertyTier): ServiceTierAvailability {
  if (propertyTier === 't1' || propertyTier === 't2') {
    return { listing: 'available', managed: 'gated', notes: VIC_MANAGED_GATED_NOTES }
  }
  return { listing: 'unsupported', managed: 'unsupported' }
}
