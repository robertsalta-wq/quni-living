import { describe, expect, it } from 'vitest'
import {
  accommodationChoiceFromFields,
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
