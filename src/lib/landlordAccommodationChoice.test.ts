import { describe, expect, it } from 'vitest'
import {
  accommodationChoiceFromFields,
  fieldsFromAccommodationChoice,
  normalizeAccommodationForSave,
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

  it('treats legacy entire_property + single as whole apartment', () => {
    expect(accommodationChoiceFromFields('entire_property', 'single')).toBe('entire_apartment')
  })

  it('normalizes private room off-site studio on save', () => {
    expect(
      normalizeAccommodationForSave('private_room_landlord_off_site', 'studio'),
    ).toEqual({
      propertyListingType: 'private_room_landlord_off_site',
      roomType: 'studio',
    })
  })
})
