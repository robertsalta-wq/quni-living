import { describe, expect, it } from 'vitest'
import {
  LISTING_CARD_PHOTO_BADGE_MAX,
  buildListingCardBadgeDisplay,
  buildListingCardImageBadges,
} from './listingCardImageBadges'

describe('buildListingCardBadgeDisplay', () => {
  it('caps photo badges and puts remaining inclusions in card body', () => {
    const { photoBadges, extraInclusionLabels } = buildListingCardBadgeDisplay({
      featured: true,
      furnished: true,
      linen_supplied: true,
      weekly_cleaning_service: true,
      property_features: [{ features: { name: 'Bills included' } }],
    })
    expect(photoBadges.length).toBe(LISTING_CARD_PHOTO_BADGE_MAX)
    expect(photoBadges.map((b) => b.label)).toEqual(['Featured', 'Furnished'])
    expect(extraInclusionLabels).toEqual(['Linen supplied', 'Weekly cleaning', 'Bills included'])
  })

  it('never puts amenity features on the photo', () => {
    const { photoBadges, extraInclusionLabels } = buildListingCardBadgeDisplay({
      furnished: true,
      property_features: [
        { features: { name: 'Bills included' } },
        { features: { name: 'WiFi' } },
        { features: { name: 'Dishwasher' } },
      ],
    })
    expect(photoBadges.map((b) => b.label)).toEqual(['Furnished', 'Bills included'])
    expect(extraInclusionLabels).toEqual([])
    expect(photoBadges.some((b) => b.label === 'WiFi')).toBe(false)
  })
})

describe('buildListingCardImageBadges', () => {
  it('returns capped photo badges only', () => {
    const badges = buildListingCardImageBadges({
      furnished: true,
      linen_supplied: true,
      weekly_cleaning_service: true,
    })
    expect(badges.length).toBe(LISTING_CARD_PHOTO_BADGE_MAX)
    expect(badges.map((b) => b.label)).toEqual(['Furnished', 'Linen supplied'])
  })
})
