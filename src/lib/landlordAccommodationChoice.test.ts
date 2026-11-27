import { describe, expect, it } from 'vitest'
import {
  accommodationChoiceFromFields,
  accommodationIntroForListingState,
  accommodationOptionsForListingState,
  fieldsFromAccommodationChoice,
  normalizeAccommodationForSave,
  roomingHouseFieldErrors,
  shouldScrollAccommodationTypeBlock,
} from './landlordAccommodationChoice'

describe('landlordAccommodationChoice', () => {
  it('maps entire-place cards to property_type + room_type', () => {
    expect(fieldsFromAccommodationChoice('entire_house')).toEqual({
      propertyListingType: 'entire_property',
      roomType: 'house',
    })
    expect(fieldsFromAccommodationChoice('entire_apartment')).toEqual({
      propertyListingType: 'entire_property',
      roomType: 'apartment',
    })
  })

  it('maps registered rooming house off-site to its own card', () => {
    expect(
      accommodationChoiceFromFields('private_room_landlord_off_site', 'single', true),
    ).toBe('registered_rooming_house')
    expect(fieldsFromAccommodationChoice('registered_rooming_house')).toEqual({
      propertyListingType: 'private_room_landlord_off_site',
      roomType: 'single',
    })
  })

  it('keeps off-site private room distinct from rooming house', () => {
    expect(
      accommodationChoiceFromFields('private_room_landlord_off_site', 'single', false),
    ).toBe('private_room_landlord_off_site')
  })

  it('normalizes private room off-site studio on save', () => {
    expect(
      normalizeAccommodationForSave('private_room_landlord_off_site', 'studio'),
    ).toEqual({
      propertyListingType: 'private_room_landlord_off_site',
      roomType: 'studio',
    })
  })

  it('scrolls type-specific fields when they appear or grow', () => {
    expect(shouldScrollAccommodationTypeBlock('entire_house', 'private_room_landlord_off_site')).toBe(true)
    expect(shouldScrollAccommodationTypeBlock('entire_apartment', 'registered_rooming_house')).toBe(true)
    expect(shouldScrollAccommodationTypeBlock('entire_studio', 'private_room_landlord_on_site')).toBe(true)
    expect(shouldScrollAccommodationTypeBlock('private_room_landlord_off_site', 'registered_rooming_house')).toBe(true)
    expect(shouldScrollAccommodationTypeBlock('shared_room', 'registered_rooming_house')).toBe(true)
  })

  it('does not scroll among whole-place cards or between small room blocks', () => {
    expect(shouldScrollAccommodationTypeBlock('entire_house', 'entire_apartment')).toBe(false)
    expect(shouldScrollAccommodationTypeBlock('private_room_landlord_off_site', 'shared_room')).toBe(false)
    expect(shouldScrollAccommodationTypeBlock('shared_room', 'private_room_landlord_off_site')).toBe(false)
    expect(shouldScrollAccommodationTypeBlock('registered_rooming_house', 'private_room_landlord_off_site')).toBe(false)
    expect(shouldScrollAccommodationTypeBlock('registered_rooming_house', 'registered_rooming_house')).toBe(false)
    expect(shouldScrollAccommodationTypeBlock('private_room_landlord_off_site', 'private_room_landlord_off_site')).toBe(
      false,
    )
  })

  it('shows the Victorian rooming house card and keeps capacity routing for the other room cards', () => {
    const vic = accommodationOptionsForListingState('VIC')
    const vicValues = vic.map((opt) => opt.value)
    expect(vicValues).toContain('registered_rooming_house')
    expect(vic.find((opt) => opt.value === 'registered_rooming_house')?.description).toBe(
      'You operate a registered rooming house and rent rooms to residents.',
    )
    expect(vicValues).toContain('private_room_landlord_off_site')
    expect(vicValues).toContain('shared_room')
    expect(accommodationOptionsForListingState('NSW').map((opt) => opt.value)).toContain(
      'registered_rooming_house',
    )
    expect(accommodationOptionsForListingState('NSW').find((opt) => opt.value === 'registered_rooming_house')?.description).toContain(
      'registered boarding house',
    )
    expect(accommodationChoiceFromFields('shared_room', 'shared', true)).toBe('registered_rooming_house')
    expect(accommodationChoiceFromFields('shared_room', 'shared', false)).toBe('shared_room')
    expect(accommodationChoiceFromFields('private_room_landlord_off_site', 'single', false)).toBe(
      'private_room_landlord_off_site',
    )
    expect(
      accommodationOptionsForListingState('VIC').find((opt) => opt.value === 'private_room_landlord_off_site')
        ?.description,
    ).not.toContain('registered boarding house')
    expect(accommodationIntroForListingState('VIC')).toContain('4 or more')
    expect(accommodationIntroForListingState('NSW')).toContain('registered boarding house')
  })

  it('flags rooming house conflicts and missing registration', () => {
    expect(
      roomingHouseFieldErrors('private_room_landlord_on_site', true, 'REG-123'),
    ).toEqual({
      onSiteConflict: expect.stringContaining("can't have the landlord living on site"),
      missingRegistration: null,
    })
    expect(
      roomingHouseFieldErrors('private_room_landlord_off_site', true, ''),
    ).toEqual({
      onSiteConflict: null,
      missingRegistration: expect.stringContaining('registration number'),
    })
  })
})
