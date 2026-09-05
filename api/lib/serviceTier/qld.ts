import type { PropertyTier, ServiceTierAvailability } from './types.js'

export function qldServiceTierAvailability(propertyTier: PropertyTier): ServiceTierAvailability {
  if (propertyTier === 't1' || propertyTier === 't2') {
    return { listing: 'available', managed: 'available' }
  }
  return {
    listing: 'available',
    managed: 'unsupported',
    notes: 'Quni does not generate Form R18 yet. Listing is available; you cannot accept an applicant until that form ships.',
  }
}
