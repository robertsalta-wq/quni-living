import type { LandlordPropertyForListingActions } from '../hooks/useLandlordPropertyListingActions'
import type { Database } from './database.types'

type PropertyStatus = Database['public']['Tables']['properties']['Row']['status']

/**
 * Draft listings already saved to the account get an in-page Publish control.
 * Admin concierge create-for-landlord stays draft-only.
 */
export function listingPageShowsPublishButton(opts: {
  status: string | null | undefined
  role: string | null | undefined
  hasSavedProperty: boolean
}): boolean {
  return opts.hasSavedProperty && opts.status === 'draft' && opts.role !== 'admin'
}

export function listingActionsFromPageSnapshot(p: {
  id: string
  title: string
  slug: string | null
  status: PropertyStatus
  authorityToLetAttestedAt: string | null
  serviceTier: LandlordPropertyForListingActions['service_tier']
  openToNonStudents: boolean
  rentPerWeek: number | null
  maxOccupants: number | null
  coupleSurchargePerWeek: number | null
  parkingSurchargePerWeek: number | null
  parkingAvailable: boolean
  state: string | null
  propertyType: string | null
  isRegisteredRoomingHouse: boolean
    listerRole: string | null
}): LandlordPropertyForListingActions {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug ?? '',
    status: p.status,
    authority_to_let_attested_at: p.authorityToLetAttestedAt,
    service_tier: p.serviceTier,
    open_to_non_students: p.openToNonStudents,
    rent_per_week: p.rentPerWeek ?? 0,
    max_occupants: p.maxOccupants ?? 1,
    couple_surcharge_per_week: p.coupleSurchargePerWeek,
    parking_surcharge_per_week: p.parkingSurchargePerWeek,
    parking_available: p.parkingAvailable,
    state: p.state,
    property_type: p.propertyType,
    is_registered_rooming_house: p.isRegisteredRoomingHouse,
    lister_role: p.listerRole === 'head_tenant' ? 'head_tenant' : 'owner',
  }
}
