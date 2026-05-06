export type PropertyTier = 't1' | 't2' | 't3'
export type ServiceTierAvailabilityStatus = 'available' | 'gated' | 'unsupported'

export type ServiceTierAvailability = {
  listing: ServiceTierAvailabilityStatus
  managed: ServiceTierAvailabilityStatus
  notes?: string
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
