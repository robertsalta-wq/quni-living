export type PropertyTier = 't1' | 't2' | 't3'
export type ServiceTierAvailabilityStatus = 'available' | 'gated' | 'unsupported'

export type ServiceTierAvailability = {
  listing: ServiceTierAvailabilityStatus
  managed: ServiceTierAvailabilityStatus
  notes?: string
}

import type { ManagedOverridesMap } from './matrix.js'

export type ResolveServiceTierOptions = {
  /** When false, Managed is gated platform-wide regardless of state matrix. */
  managedGloballyEnabled?: boolean
  /** Admin-editable overrides from `service_tier_state_matrix` (key: `STATE:tier`). */
  managedOverrides?: ManagedOverridesMap
}

export type ServiceTierResolverState =
  | 'NSW'
  | 'QLD'
  | 'VIC'
  | 'SA'
  | 'WA'
  | 'ACT'
  | 'NT'
  | 'TAS'
