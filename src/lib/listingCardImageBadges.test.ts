import { describe, expect, it } from 'vitest'
import {
  buildListingCardImageBadges,
  listingCardBadgeVisibleOnMobile,
} from './listingCardImageBadges'

describe('buildListingCardImageBadges', () => {
  it('includes inclusion badges from property fields and features', () => {
    const badges = buildListingCardImageBadges({
      featured: true,
      furnished: true,
      linen_supplied: true,
      weekly_cleaning_service: false,
      property_features: [{ features: { name: 'Bills included' } }],
    })
    expect(badges.map((b) => b.label)).toEqual([
      'Featured',
      'Furnished',
      'Linen supplied',
      'Bills included',
    ])
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
    expect(listingCardBadgeVisibleOnMobile(badges, 'linen')).toBe(true)
    expect(listingCardBadgeVisibleOnMobile(badges, 'weekly')).toBe(false)
  })
})
