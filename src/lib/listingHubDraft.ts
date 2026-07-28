/** Lightweight bridge to the landlord new-listing localStorage draft used by LandlordPropertyFormPage. */

const LANDLORD_PROPERTY_DRAFT_KEY = 'landlord_property_draft'
const LANDLORD_PROPERTY_DRAFT_VERSION = 1

export type HubDraftBasicPatch = {
  title: string
  headline?: string
  availableFrom: string
  openToNonStudents: boolean
  propertyListingType: string
  roomType: string
  isRegisteredRoomingHouse: boolean
}

function emptyDraftBase(): Record<string, unknown> {
  return {
    v: LANDLORD_PROPERTY_DRAFT_VERSION,
    title: '',
    description: '',
    bedrooms: '1',
    bathrooms: '1',
    roomsRentedToResidents: '1',
    roomType: 'apartment',
    propertyListingType: 'entire_property',
    furnished: false,
    linenSupplied: false,
    weeklyCleaning: false,
    openToNonStudents: false,
    selectedFeatureIds: [],
    address: '',
    suburb: '',
    state: 'NSW',
    postcode: '',
    universityId: '',
    campusId: '',
    latitude: null,
    longitude: null,
    showAddAnotherUniversity: false,
    rentPerWeek: '',
    maxOccupants: '1',
    coupleSurchargePerWeek: '',
    parkingSurchargePerWeek: '',
    parkingAvailable: false,
    bondWeeks: '4',
    qldBondRemittancePreference: 'tenant_choice',
    leaseLength: 'Flexible',
    availableFrom: '',
    images: [],
    isRegisteredRoomingHouse: false,
    roomingHouseRegistrationNumber: '',
    serviceTier: 'listing',
    houseRules: '',
    selectedRules: {},
    headline: '',
  }
}

export function readLandlordPropertyDraftRaw(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(LANDLORD_PROPERTY_DRAFT_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object') return null
    const d = o as Record<string, unknown>
    if (d.v !== LANDLORD_PROPERTY_DRAFT_VERSION) return null
    return d
  } catch {
    return null
  }
}

export function patchLandlordPropertyDraftBasic(patch: HubDraftBasicPatch): void {
  const existing = readLandlordPropertyDraftRaw() ?? emptyDraftBase()
  const next = {
    ...existing,
    v: LANDLORD_PROPERTY_DRAFT_VERSION,
    title: patch.title,
    availableFrom: patch.availableFrom,
    openToNonStudents: patch.openToNonStudents,
    propertyListingType: patch.propertyListingType,
    roomType: patch.roomType,
    isRegisteredRoomingHouse: patch.isRegisteredRoomingHouse,
    headline: patch.headline ?? '',
  }
  try {
    localStorage.setItem(LANDLORD_PROPERTY_DRAFT_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export function listingHeadlineStorageKey(propertyId: string): string {
  return `quni.listing.headline.${propertyId}`
}

export function readListingHeadline(propertyId: string | null): string {
  if (!propertyId) {
    const d = readLandlordPropertyDraftRaw()
    return typeof d?.headline === 'string' ? d.headline : ''
  }
  try {
    return localStorage.getItem(listingHeadlineStorageKey(propertyId)) ?? ''
  } catch {
    return ''
  }
}

export function writeListingHeadline(propertyId: string | null, headline: string): void {
  const v = headline.trim()
  if (!propertyId) {
    const existing = readLandlordPropertyDraftRaw() ?? emptyDraftBase()
    try {
      localStorage.setItem(
        LANDLORD_PROPERTY_DRAFT_KEY,
        JSON.stringify({ ...existing, v: LANDLORD_PROPERTY_DRAFT_VERSION, headline: v }),
      )
    } catch {
      /* ignore */
    }
    return
  }
  try {
    if (v) localStorage.setItem(listingHeadlineStorageKey(propertyId), v)
    else localStorage.removeItem(listingHeadlineStorageKey(propertyId))
  } catch {
    /* ignore */
  }
}
