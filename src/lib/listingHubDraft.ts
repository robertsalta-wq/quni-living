/** Bridge to landlord listing localStorage drafts used by LandlordPropertyFormPage + hub Basic. */

const LANDLORD_PROPERTY_DRAFT_KEY = 'landlord_property_draft'
const LANDLORD_PROPERTY_EDIT_DRAFT_PREFIX = 'landlord_property_edit_draft:'
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

export function landlordPropertyNewDraftKey(): string {
  return LANDLORD_PROPERTY_DRAFT_KEY
}

export function landlordPropertyEditDraftKey(propertyId: string): string {
  return `${LANDLORD_PROPERTY_EDIT_DRAFT_PREFIX}${propertyId}`
}

function emptyDraftBase(): Record<string, unknown> {
  return {
    v: LANDLORD_PROPERTY_DRAFT_VERSION,
    title: '',
    description: '',
    bedrooms: '1',
    bathrooms: '1',
    roomsRentedToResidents: '',
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

function parseDraftObject(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object') return null
    const d = o as Record<string, unknown>
    if (d.v !== LANDLORD_PROPERTY_DRAFT_VERSION) return null
    return d
  } catch {
    return null
  }
}

export function readLandlordPropertyDraftRaw(): Record<string, unknown> | null {
  try {
    return parseDraftObject(localStorage.getItem(LANDLORD_PROPERTY_DRAFT_KEY))
  } catch {
    return null
  }
}

export function readLandlordPropertyEditDraftRaw(propertyId: string): Record<string, unknown> | null {
  try {
    return parseDraftObject(localStorage.getItem(landlordPropertyEditDraftKey(propertyId)))
  } catch {
    return null
  }
}

/** @returns false when localStorage write failed (quota / private mode). */
export function writeLandlordPropertyDraftRaw(
  key: string,
  draft: Record<string, unknown>,
): boolean {
  try {
    localStorage.setItem(key, JSON.stringify({ ...draft, v: LANDLORD_PROPERTY_DRAFT_VERSION }))
    return true
  } catch {
    return false
  }
}

export function clearLandlordPropertyNewDraft(): void {
  try {
    localStorage.removeItem(LANDLORD_PROPERTY_DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

export function clearLandlordPropertyEditDraft(propertyId: string): void {
  try {
    localStorage.removeItem(landlordPropertyEditDraftKey(propertyId))
  } catch {
    /* ignore */
  }
}

function patchDraftBasic(existing: Record<string, unknown>, patch: HubDraftBasicPatch): Record<string, unknown> {
  return {
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
}

export function patchLandlordPropertyDraftBasic(patch: HubDraftBasicPatch): boolean {
  const existing = readLandlordPropertyDraftRaw() ?? emptyDraftBase()
  return writeLandlordPropertyDraftRaw(LANDLORD_PROPERTY_DRAFT_KEY, patchDraftBasic(existing, patch))
}

/** Property-scoped Basic patch for edit-mode drill-in autosave. */
export function patchLandlordPropertyEditDraftBasic(
  propertyId: string,
  patch: HubDraftBasicPatch,
): boolean {
  const existing = readLandlordPropertyEditDraftRaw(propertyId) ?? emptyDraftBase()
  return writeLandlordPropertyDraftRaw(
    landlordPropertyEditDraftKey(propertyId),
    patchDraftBasic(existing, patch),
  )
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
    writeLandlordPropertyDraftRaw(LANDLORD_PROPERTY_DRAFT_KEY, { ...existing, headline: v })
    return
  }
  try {
    if (v) localStorage.setItem(listingHeadlineStorageKey(propertyId), v)
    else localStorage.removeItem(listingHeadlineStorageKey(propertyId))
  } catch {
    /* ignore */
  }
}
