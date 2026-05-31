import { describe, expect, it } from 'vitest'
import {
  buildListingCardImageBadges,
  listingCardBadgeVisibleOnMobile,
} from './listingCardImageBadges'

describe('buildListingCardImageBadges', () => {
  it('includes inclusion badges only, not amenity features', () => {
    const badges = buildListingCardImageBadges({
      featured: true,
      furnished: true,
      linen_supplied: true,
      weekly_cleaning_service: false,
      property_features: [
        { features: { name: 'Bills included' } },
        { features: { name: 'WiFi' } },
        { features: { name: 'Dishwasher' } },
      ],
    })
    expect(badges.map((b) => b.label)).toEqual([
      'Featured',
      'Furnished',
      'Linen supplied',
      'Bills included',
    ])
    expect(badges.some((b) => b.label === 'WiFi')).toBe(false)
  })

  it('limits mobile inclusion badges when featured is set', () => {
    const badges = buildListingCardImageBadges({
      featured: true,
      furnished: true,
      linen_supplied: true,
      weekly_cleaning_service: true,
    })
    expect(listingCardBadgeVisibleOnMobile(badges, 'featured')).toBe(true)
    expect(listingCardBadgeVisibleOnMobile(badges, 'furnished')).toBe(true)
    expect(listingCardBadgeVisibleOnMobile(badges, 'linen-supplied')).toBe(true)
    expect(listingCardBadgeVisibleOnMobile(badges, 'weekly-cleaning')).toBe(false)
  })
})
