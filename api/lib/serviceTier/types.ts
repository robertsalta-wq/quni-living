export type PropertyTier = 't1' | 't2' | 't3'
export type ServiceTierAvailabilityStatus = 'available' | 'gated' | 'unsupported'

export type ServiceTierAvailability = {
  listing: ServiceTierAvailabilityStatus
  managed: ServiceTierAvailabilityStatus
  notes?: string
}

export type ResolveServiceTierOptions = {
  /** When false, Managed is gated platform-wide regardless of state matrix. */
  managedGloballyEnabled?: boolean
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
