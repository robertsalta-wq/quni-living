/**
 * NSW service-tier matrix (tier-disambiguated; do not collapse to a single "NSW Managed" rule).
 *
 * - T1 Managed = available — boarder/lodger arrangement; RTA does not apply; PSAA characterisation not triggered.
 * - T2 Managed = gated — RTA residential tenancy; PSAA s.3A question pending external legal opinion. Gated until resolved.
 * - The matrix is tier-disambiguated; "NSW Managed gated" as a blanket rule is incorrect.
 */

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
