/**
 * NSW FT6600 page-1 landlord block + agent block: tier rules and validation.
 * `hasManagingAgent` is derived from `service_tier === 'managed'`, never landlord-entered.
 */

export type Ft6600LandlordProfileInput = {
  first_name?: string | null
  last_name?: string | null
  full_name?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  suburb?: string | null
  state?: string | null
  postcode?: string | null
  /** Free-text State/Territory or country when landlord does not ordinarily reside in NSW. */
  residence_location?: string | null
}

export const NSW_FT6600_LANDLORD_FIELD_LABELS = {
  name: 'Landlord name',
  contact: 'Landlord phone or contact details',
  residence: 'State/Territory or country of residence (non-NSW landlords)',
  serviceStreet: 'Landlord street address for service of notices',
  serviceSuburb: 'Landlord suburb for service of notices',
  serviceState: 'Landlord state for service of notices',
  servicePostcode: 'Landlord postcode for service of notices',
} as const

export function ft6600LandlordFullName(lp: Ft6600LandlordProfileInput): string {
  const fromParts = [lp.first_name, lp.last_name].filter(Boolean).join(' ').trim()
  if (fromParts) return fromParts
  return typeof lp.full_name === 'string' ? lp.full_name.trim() : ''
}

export function ft6600LandlordPhone(lp: Ft6600LandlordProfileInput): string {
  return typeof lp.phone === 'string' ? lp.phone.trim() : ''
}

/** Managed tier: Quni is the landlord's agent on the FT6600 schedule. */
export function hasManagingAgentForFt6600(serviceTier: 'listing' | 'managed'): boolean {
  return serviceTier === 'managed'
}

export function landlordOrdinarilyResidesInNsw(state: string | null | undefined): boolean {
  return (state ?? '').trim().toUpperCase() === 'NSW'
}

/**
 * FT6600 "If not in NSW, the State/Territory/country…" line (`landlord_overseas`).
 * Uses `residence_location` when set; otherwise non-NSW `state` on the profile address.
 */
export function ft6600LandlordResidenceLine(lp: Ft6600LandlordProfileInput): string {
  const explicit =
    typeof lp.residence_location === 'string' ? lp.residence_location.trim() : ''
  if (explicit) return explicit
  const state = typeof lp.state === 'string' ? lp.state.trim() : ''
  if (state && !landlordOrdinarilyResidesInNsw(state)) return state
  return ''
}

export function missingFt6600LandlordScheduleFields(
  lp: Ft6600LandlordProfileInput,
  serviceTier: 'listing' | 'managed',
): string[] {
  const missing: string[] = []
  if (!ft6600LandlordFullName(lp)) missing.push(NSW_FT6600_LANDLORD_FIELD_LABELS.name)
  if (!ft6600LandlordPhone(lp)) missing.push(NSW_FT6600_LANDLORD_FIELD_LABELS.contact)

  if (!landlordOrdinarilyResidesInNsw(lp.state) && !ft6600LandlordResidenceLine(lp)) {
    missing.push(NSW_FT6600_LANDLORD_FIELD_LABELS.residence)
  }

  if (serviceTier === 'listing') {
    if (!(typeof lp.address === 'string' && lp.address.trim())) {
      missing.push(NSW_FT6600_LANDLORD_FIELD_LABELS.serviceStreet)
    }
    if (!(typeof lp.suburb === 'string' && lp.suburb.trim())) {
      missing.push(NSW_FT6600_LANDLORD_FIELD_LABELS.serviceSuburb)
    }
    if (!(typeof lp.state === 'string' && lp.state.trim())) {
      missing.push(NSW_FT6600_LANDLORD_FIELD_LABELS.serviceState)
    }
    if (!(typeof lp.postcode === 'string' && lp.postcode.trim())) {
      missing.push(NSW_FT6600_LANDLORD_FIELD_LABELS.servicePostcode)
    }
  }

  return missing
}

export function nswFt6600LandlordScheduleBlockedMessage(missingLabels: string[]): string {
  if (missingLabels.length === 0) {
    return 'Complete your landlord profile (name, contact, and address details) before generating the NSW tenancy agreement.'
  }
  return `Complete your landlord profile before generating the NSW tenancy agreement. Missing: ${missingLabels.join('; ')}.`
}

/**
 * NSW T2 Managed FT6600 with agent block stays dormant until PSAA clearance (Jenny s.3A opinion).
 * Listing NSW path remains live; Managed agent fill is built but blocked at generation here.
 */
export function nswManagedFt6600LeaseGenerationBlocked(args: {
  propertyState: string | null | undefined
  propertyType: string | null | undefined
  isRegisteredRoomingHouse: boolean | null | undefined
  serviceTier: 'listing' | 'managed'
}): boolean {
  if (args.serviceTier !== 'managed') return false
  const state = (args.propertyState ?? '').trim().toUpperCase()
  if (state !== 'NSW') return false
  const propertyType = (args.propertyType ?? '').trim()
  const isRooming = args.isRegisteredRoomingHouse === true
  return (
    (propertyType === 'private_room_landlord_off_site' ||
      propertyType === 'entire_property' ||
      propertyType === 'shared_room') &&
    !isRooming
  )
}

export const NSW_MANAGED_FT6600_GENERATION_BLOCKED_MESSAGE =
  'NSW Quni Managed residential tenancy agreements are not available yet. Use Quni Listing for this property, or contact support when Managed is cleared for NSW.'
