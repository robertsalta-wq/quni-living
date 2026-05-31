import { describe, expect, it } from 'vitest'
import {
  formatListingCardBedIconLabel,
  formatListingCardContextLine,
  formatListingDetailAccommodation,
  hasWholePropertyBedCount,
} from './listingAccommodationDisplay'

describe('listingAccommodationDisplay', () => {
  const shareHouseRoom = {
    property_type: 'private_room_landlord_off_site' as const,
    room_type: 'single' as const,
    bedrooms: 5,
    bathrooms: 2,
  }

  it('formats card context and icon labels for a private room in a share house', () => {
    expect(formatListingCardContextLine(shareHouseRoom)).toBe(
      '1 private room in a 5 bed · 2 bath share house',
    )
    expect(formatListingCardBedIconLabel(shareHouseRoom)).toBe('5 bed house')
    expect(formatListingDetailAccommodation(shareHouseRoom)).toBe(
      '1 private room in a 5 bedrooms, 2 bathrooms house',
    )
  })

  it('omits house stats for legacy room listings with bedrooms: 1', () => {
    const legacy = { ...shareHouseRoom, bedrooms: 1 }
    expect(hasWholePropertyBedCount(legacy)).toBe(false)
    expect(formatListingCardContextLine(legacy)).toBeNull()
    expect(formatListingCardBedIconLabel(legacy)).toBeNull()
  })

  it('keeps entire-place bed labels unchanged', () => {
    const entire = {
      property_type: 'entire_property' as const,
      room_type: 'house' as const,
      bedrooms: 3,
      bathrooms: 2,
    }
    expect(formatListingCardContextLine(entire)).toBeNull()
    expect(formatListingCardBedIconLabel(entire)).toBe('3 bed')
  })
})
