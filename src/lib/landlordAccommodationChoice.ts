import { ROOM_TYPE_LABELS, type PropertyListingType, type RoomType } from './listings'

/** Landlord-facing accommodation cards (maps to `property_type` + `room_type`). */
export type AccommodationUiChoice =
  | 'entire_house'
  | 'entire_apartment'
  | 'entire_studio'
  | 'private_room_landlord_off_site'
  | 'private_room_landlord_on_site'
  | 'shared_room'

export const ACCOMMODATION_UI_OPTIONS: {
  value: AccommodationUiChoice
  title: string
  description: string
}[] = [
  {
    value: 'entire_house',
    title: 'Whole house',
    description: 'The tenant rents the entire house (you do not live on site).',
  },
  {
    value: 'entire_apartment',
    title: 'Whole apartment or unit',
    description: 'The tenant rents the entire apartment or unit.',
  },
  {
    value: 'entire_studio',
    title: 'Studio (whole place)',
    description: 'A self-contained studio the tenant rents in full.',
  },
  {
    value: 'private_room_landlord_off_site',
    title: 'One private room',
    description: 'A bedroom in a shared house - you do not live on site.',
  },
  {
    value: 'private_room_landlord_on_site',
    title: 'A room in my home',
    description: 'You live on site (boarder or lodger style).',
  },
  {
    value: 'shared_room',
    title: 'A shared bedroom',
    description: 'Tenant shares a bedroom with other residents.',
  },
]

export function isEntirePlaceChoice(choice: AccommodationUiChoice): boolean {
  return choice === 'entire_house' || choice === 'entire_apartment' || choice === 'entire_studio'
}

export function fieldsFromAccommodationChoice(choice: AccommodationUiChoice): {
  propertyListingType: PropertyListingType
  roomType: RoomType
} {
  switch (choice) {
    case 'entire_house':
      return { propertyListingType: 'entire_property', roomType: 'house' }
    case 'entire_apartment':
      return { propertyListingType: 'entire_property', roomType: 'apartment' }
    case 'entire_studio':
      return { propertyListingType: 'entire_property', roomType: 'studio' }
    case 'private_room_landlord_off_site':
      return { propertyListingType: 'private_room_landlord_off_site', roomType: 'single' }
    case 'private_room_landlord_on_site':
      return { propertyListingType: 'private_room_landlord_on_site', roomType: 'single' }
    case 'shared_room':
      return { propertyListingType: 'shared_room', roomType: 'shared' }
  }
}

/** Infer UI card from stored DB fields (handles legacy entire_property + single/shared). */
export function accommodationChoiceFromFields(
  propertyListingType: PropertyListingType,
  roomType: RoomType | '',
): AccommodationUiChoice {
  if (propertyListingType === 'entire_property') {
    if (roomType === 'house') return 'entire_house'
    if (roomType === 'studio') return 'entire_studio'
    return 'entire_apartment'
  }
  if (propertyListingType === 'private_room_landlord_off_site') {
    return 'private_room_landlord_off_site'
  }
  if (propertyListingType === 'private_room_landlord_on_site') {
    return 'private_room_landlord_on_site'
  }
  return 'shared_room'
}

export function showRoomForRentSelect(choice: AccommodationUiChoice): boolean {
  return !isEntirePlaceChoice(choice)
}

export function roomForRentOptions(choice: AccommodationUiChoice): [RoomType, string][] {
  if (choice === 'private_room_landlord_off_site') {
    return [
      ['single', ROOM_TYPE_LABELS.single],
      ['studio', ROOM_TYPE_LABELS.studio],
    ]
  }
  if (choice === 'private_room_landlord_on_site') {
    return [['single', ROOM_TYPE_LABELS.single]]
  }
  if (choice === 'shared_room') {
    return [['shared', ROOM_TYPE_LABELS.shared]]
  }
  return []
}

/** Coerce stored/partial values before save. */
export const ROOMING_HOUSE_ON_SITE_ERROR =
  "A registered rooming house can't have the landlord living on site. Either untick the rooming house checkbox or change the accommodation type."

export const ROOMING_HOUSE_REGISTRATION_REQUIRED_ERROR =
  "Enter your rooming house registration number, or untick registered rooming house if this doesn't apply."

export function roomingHouseFieldErrors(
  propertyListingType: PropertyListingType,
  isRegisteredRoomingHouse: boolean,
  roomingHouseRegistrationNumber: string,
): { onSiteConflict: string | null; missingRegistration: string | null } {
  const onSiteConflict =
    isRegisteredRoomingHouse && propertyListingType === 'private_room_landlord_on_site'
      ? ROOMING_HOUSE_ON_SITE_ERROR
      : null
  const missingRegistration =
    isRegisteredRoomingHouse && !roomingHouseRegistrationNumber.trim()
      ? ROOMING_HOUSE_REGISTRATION_REQUIRED_ERROR
      : null
  return { onSiteConflict, missingRegistration }
}

export function normalizeAccommodationForSave(
  propertyListingType: PropertyListingType,
  roomType: RoomType | '',
): { propertyListingType: PropertyListingType; roomType: RoomType } {
  const choice = accommodationChoiceFromFields(propertyListingType, roomType)
  if (isEntirePlaceChoice(choice)) {
    return fieldsFromAccommodationChoice(choice)
  }
  if (choice === 'private_room_landlord_off_site') {
    return {
      propertyListingType: 'private_room_landlord_off_site',
      roomType: roomType === 'studio' ? 'studio' : 'single',
    }
  }
  if (choice === 'private_room_landlord_on_site') {
    return { propertyListingType: 'private_room_landlord_on_site', roomType: 'single' }
  }
  return { propertyListingType: 'shared_room', roomType: 'shared' }
}
