import type { PropertyListingType, RoomType } from './listings'
import { accommodationChoiceFromFields, isEntirePlaceChoice } from './landlordAccommodationChoice'
import { normalizePropertyImages } from './propertyImages'

/**
 * One order for the desktop form and the mobile steps.
 * Utilities and compliance are one slot. The label depends on the state.
 */
export const LISTING_HUB_SECTION_IDS = [
  'basic',
  'location',
  'property',
  'inclusions',
  'services',
  'rules',
  'pricing',
  'description',
  'photos',
] as const

export type ListingHubSectionId = (typeof LISTING_HUB_SECTION_IDS)[number]

export type ListingHubSectionStatus = 'complete' | 'attention' | 'notstarted'

/** Highest-impact nudge order when picking quality subtext. */
export const LISTING_HUB_IMPACT_PRIORITY: ListingHubSectionId[] = [
  'photos',
  'pricing',
  'description',
  'basic',
  'property',
  'location',
  'inclusions',
  'services',
  'rules',
]

export type ListingHubHealthInput = {
  title: string | null | undefined
  propertyType: string | null | undefined
  roomType: string | null | undefined
  isRegisteredRoomingHouse: boolean
  bedrooms: number | null | undefined
  bathrooms: number | null | undefined
  furnished: boolean | null | undefined
  linenSupplied: boolean | null | undefined
  weeklyCleaning: boolean | null | undefined
  featureCount: number
  /** Soft signal: utilities/bills touched (QLD/VIC). When null, ignored. */
  utilitiesStarted?: boolean | null
  /** Smoke alarms, embedded networks, strata, or utility bill answers. */
  servicesStarted?: boolean | null
  houseRulesText: string | null | undefined
  selectedRulesCount: number
  address: string | null | undefined
  suburb: string | null | undefined
  state: string | null | undefined
  postcode: string | null | undefined
  description: string | null | undefined
  rentPerWeek: number | null | undefined
  availableFrom: string | null | undefined
  images: string[] | null | undefined
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'draft' | null | undefined
}

export type ListingHubSectionMeta = {
  id: ListingHubSectionId
  title: string
  subtitle: string
  aiTag?: 'writer' | 'price'
  /** Form section id(s) when drilling into the legacy form. */
  formSectionIds: string[]
  step: number
}

export const LISTING_HUB_SECTIONS: ListingHubSectionMeta[] = [
  {
    id: 'basic',
    title: 'Basic info',
    subtitle: 'Listing title, type, and who can enquire',
    formSectionIds: ['section-basic-info'],
    step: 1,
  },
  {
    id: 'location',
    title: 'Location',
    subtitle: 'Address, suburb, state, postcode, and campus',
    formSectionIds: ['section-location'],
    step: 2,
  },
  {
    id: 'property',
    title: 'Property details',
    subtitle: 'Accommodation type, bedrooms, and state questions',
    formSectionIds: ['section-property-details'],
    step: 3,
  },
  {
    id: 'inclusions',
    title: 'Inclusions',
    subtitle: 'Furnished, linen, cleaning, and features',
    formSectionIds: ['section-inclusions-features'],
    step: 4,
  },
  {
    id: 'services',
    title: 'Utilities and compliance',
    subtitle: 'Smoke alarms, embedded networks, and strata',
    formSectionIds: ['section-services', 'section-ft6600-compliance', 'section-utilities'],
    step: 5,
  },
  {
    id: 'rules',
    title: 'Rules',
    subtitle: 'House rules - yes, no or on approval',
    formSectionIds: ['section-house-rules'],
    step: 6,
  },
  {
    id: 'pricing',
    title: 'Pricing',
    subtitle: 'Rent, bond, availability, and surcharges',
    aiTag: 'price',
    formSectionIds: ['section-pricing-availability'],
    step: 7,
  },
  {
    id: 'description',
    title: 'Description',
    subtitle: 'Tell students about the place',
    aiTag: 'writer',
    formSectionIds: ['section-description'],
    step: 8,
  },
  {
    id: 'photos',
    title: 'Photos',
    subtitle: 'Upload, reorder, add captions',
    formSectionIds: ['section-photos'],
    step: 9,
  },
]

export function listingStateUsesServicesSection(state: string | null | undefined): boolean {
  const code = (state ?? '').trim().toUpperCase()
  return code === 'NSW' || code === 'QLD' || code === 'VIC'
}

/** Visible sections for a state. NSW, QLD and VIC include utilities or compliance. */
export function listingHubSectionIdsForState(state: string | null | undefined): ListingHubSectionId[] {
  if (listingStateUsesServicesSection(state)) return [...LISTING_HUB_SECTION_IDS]
  return LISTING_HUB_SECTION_IDS.filter((id) => id !== 'services')
}

export function listingSectionLabel(id: ListingHubSectionId, state: string | null | undefined): string {
  if (id !== 'services') return LISTING_HUB_SECTIONS.find((section) => section.id === id)?.title ?? id
  const code = (state ?? '').trim().toUpperCase()
  if (code === 'NSW') return 'Compliance'
  if (code === 'QLD' || code === 'VIC') return 'Utilities'
  return 'Utilities and compliance'
}

export function listingSectionSubtitle(id: ListingHubSectionId, state: string | null | undefined): string {
  if (id !== 'services') return LISTING_HUB_SECTIONS.find((section) => section.id === id)?.subtitle ?? ''
  const code = (state ?? '').trim().toUpperCase()
  if (code === 'NSW') return 'Smoke alarms, embedded networks, and strata'
  if (code === 'QLD' || code === 'VIC') return 'Utilities, water, and how bills are shared'
  return 'Shown once the state is NSW, Queensland, or Victoria'
}

/** Desktop jump pills. Same ids and order as the mobile steps. */
export function listingFormNavItems(state: string | null | undefined): { id: string; label: string }[] {
  return listingHubSectionIdsForState(state).map((id) => {
    const section = LISTING_HUB_SECTIONS.find((item) => item.id === id)
    return {
      id: section?.formSectionIds[0] ?? `section-${id}`,
      label: listingSectionLabel(id, state),
    }
  })
}

export type HubListingTypeTile = 'entire' | 'room' | 'rooming'

export function hubListingTypeTileFromFields(
  propertyListingType: PropertyListingType | string | null | undefined,
  roomType: RoomType | string | null | undefined,
  isRegisteredRoomingHouse: boolean,
): HubListingTypeTile | null {
  if (isRegisteredRoomingHouse) return 'rooming'
  if (!propertyListingType) return null
  const choice = accommodationChoiceFromFields(
    propertyListingType as PropertyListingType,
    (roomType as RoomType | '') || '',
  )
  if (isEntirePlaceChoice(choice)) return 'entire'
  return 'room'
}

export function fieldsFromHubListingTypeTile(
  tile: HubListingTypeTile,
  current: {
    propertyListingType: PropertyListingType
    roomType: RoomType | ''
  },
  roomingOccupancy: 'private' | 'shared' = 'private',
): {
  propertyListingType: PropertyListingType
  roomType: RoomType
  isRegisteredRoomingHouse: boolean
} {
  if (tile === 'rooming') {
    if (roomingOccupancy === 'shared') {
      return {
        propertyListingType: 'shared_room',
        roomType: 'shared',
        isRegisteredRoomingHouse: true,
      }
    }
    return {
      propertyListingType: 'private_room_landlord_off_site',
      roomType: 'single',
      isRegisteredRoomingHouse: true,
    }
  }
  if (tile === 'entire') {
    const choice = accommodationChoiceFromFields(current.propertyListingType, current.roomType)
    if (isEntirePlaceChoice(choice)) {
      return {
        propertyListingType: current.propertyListingType,
        roomType: (current.roomType || 'apartment') as RoomType,
        isRegisteredRoomingHouse: false,
      }
    }
    return {
      propertyListingType: 'entire_property',
      roomType: 'apartment',
      isRegisteredRoomingHouse: false,
    }
  }
  // private room - preserve on-site vs off-site when already a room listing
  if (
    current.propertyListingType === 'private_room_landlord_on_site' ||
    current.propertyListingType === 'private_room_landlord_off_site' ||
    current.propertyListingType === 'shared_room'
  ) {
    return {
      propertyListingType: current.propertyListingType,
      roomType: (current.roomType || 'single') as RoomType,
      isRegisteredRoomingHouse: false,
    }
  }
  return {
    propertyListingType: 'private_room_landlord_off_site',
    roomType: 'single',
    isRegisteredRoomingHouse: false,
  }
}

function hasText(v: string | null | undefined): boolean {
  return Boolean(v && v.trim())
}

function photoCount(images: string[] | null | undefined): number {
  return normalizePropertyImages(images).length
}

export function listingHubSectionStatus(
  id: ListingHubSectionId,
  input: ListingHubHealthInput,
): ListingHubSectionStatus {
  switch (id) {
    case 'basic': {
      const titleOk = hasText(input.title)
      const typeOk = Boolean(input.propertyType) || input.isRegisteredRoomingHouse
      if (!titleOk && !typeOk) return 'notstarted'
      if (titleOk && typeOk) return 'complete'
      return 'attention'
    }
    case 'property': {
      const beds = input.bedrooms != null && input.bedrooms > 0
      const baths = input.bathrooms != null && input.bathrooms > 0
      if (!beds && !baths) return 'notstarted'
      if (beds && baths) return 'complete'
      return 'attention'
    }
    case 'inclusions': {
      const anyFlag =
        Boolean(input.furnished) ||
        Boolean(input.linenSupplied) ||
        Boolean(input.weeklyCleaning) ||
        input.featureCount > 0 ||
        input.utilitiesStarted === true
      if (!anyFlag) return 'notstarted'
      return 'complete'
    }
    case 'rules': {
      if (input.selectedRulesCount > 0 || hasText(input.houseRulesText)) return 'complete'
      return 'notstarted'
    }
    case 'location': {
      const parts = [input.address, input.suburb, input.state, input.postcode].filter(hasText)
      if (parts.length === 0) return 'notstarted'
      if (parts.length >= 4) return 'complete'
      return 'attention'
    }
    case 'description': {
      const len = (input.description ?? '').trim().length
      if (len === 0) return 'notstarted'
      if (len >= 80) return 'complete'
      return 'attention'
    }
    case 'pricing': {
      const rent = Number(input.rentPerWeek)
      const hasRent = Number.isFinite(rent) && rent > 0
      const hasAvail = hasText(input.availableFrom)
      if (!hasRent && !hasAvail) return 'notstarted'
      if (hasRent && hasAvail) return 'complete'
      return 'attention'
    }
    case 'photos': {
      const n = photoCount(input.images)
      if (n === 0) return 'notstarted'
      if (n >= 3) return 'complete'
      return 'attention'
    }
    case 'services': {
      if (!listingStateUsesServicesSection(input.state)) return 'complete'
      if (input.servicesStarted === true) return 'complete'
      return 'notstarted'
    }
  }
}

export type ListingHubHealthResult = {
  statuses: Record<ListingHubSectionId, ListingHubSectionStatus>
  score: number
  completeCount: number
  isSetupMode: boolean
  qualityHeadline: string
  qualitySubtext: string
  firstIncomplete: ListingHubSectionId | null
}

export function computeListingHubHealth(
  input: ListingHubHealthInput,
  opts?: { isNewListing?: boolean },
): ListingHubHealthResult {
  const statuses = {} as Record<ListingHubSectionId, ListingHubSectionStatus>
  const counted = listingHubSectionIdsForState(input.state)
  let completeCount = 0
  for (const id of LISTING_HUB_SECTION_IDS) {
    const s = listingHubSectionStatus(id, input)
    statuses[id] = s
  }
  for (const id of counted) {
    if (statuses[id] === 'complete') completeCount += 1
  }
  const score = Math.round((completeCount / counted.length) * 100)

  const isSetupMode =
    Boolean(opts?.isNewListing) || input.status === 'draft' || input.status == null

  const firstIncomplete =
    LISTING_HUB_IMPACT_PRIORITY.find((id) => counted.includes(id) && statuses[id] !== 'complete') ?? null

  const nudgeCopy: Record<ListingHubSectionId, string> = {
    photos: 'Add a few more photos to reach top-listing quality and rank higher in search.',
    pricing: 'Add rent and an available-from date so students can enquire with confidence.',
    description: 'Write a fuller description - students decide from the story of the place.',
    basic: 'Finish Basic info (title and listing type) to unlock a clearer listing.',
    property: 'Confirm bedrooms and bathrooms so students can filter accurately.',
    location: 'Complete the address so we can pin the map and nearby campuses.',
    inclusions: 'Add inclusions or features so students know what is covered.',
    services: 'Answer the utilities or compliance questions for this state.',
    rules: 'Set house rules so expectations are clear before they enquire.',
  }

  let qualityHeadline: string
  let qualitySubtext: string
  if (isSetupMode) {
    qualityHeadline = "Let's get your listing ready"
    qualitySubtext = firstIncomplete
      ? nudgeCopy[firstIncomplete]
      : 'Complete each section - Basic info is the best place to start.'
    if (!firstIncomplete || firstIncomplete === 'basic') {
      qualitySubtext = 'Complete each section - Basic info is the best place to start.'
    }
  } else if (score >= 100) {
    qualityHeadline = 'Listing looks excellent'
    qualitySubtext = 'Everything is green - keep photos and pricing up to date.'
  } else if (score >= 75) {
    qualityHeadline = 'Your listing is in good shape'
    qualitySubtext = firstIncomplete ? nudgeCopy[firstIncomplete] : 'One more polish and you are at 100%.'
  } else {
    qualityHeadline = 'A few sections still need work'
    qualitySubtext = firstIncomplete ? nudgeCopy[firstIncomplete] : 'Complete the remaining sections to improve search rank.'
  }

  return {
    statuses,
    score,
    completeCount,
    isSetupMode,
    qualityHeadline,
    qualitySubtext,
    firstIncomplete,
  }
}

/** Map form section DOM id → hub card id. */
export function hubSectionIdFromFormSectionId(formSectionId: string): ListingHubSectionId | null {
  const cleaned = formSectionId.replace(/^#/, '')
  for (const meta of LISTING_HUB_SECTIONS) {
    if (meta.formSectionIds.includes(cleaned)) return meta.id
  }
  return null
}

export function listingHubPath(opts: {
  propertyId: string | null
  view?: 'hub' | 'basic' | ListingHubSectionId
}): string {
  const base = opts.propertyId
    ? `/landlord/property/edit/${opts.propertyId}`
    : '/landlord/property/new'
  if (!opts.view || opts.view === 'hub') return base
  if (opts.view === 'basic') return `${base}/basic`
  return `${base}/section/${opts.view}`
}
