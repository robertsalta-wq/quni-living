import { describe, expect, it } from 'vitest'
import {
  LISTING_PHOTO_BADGE_MAX,
  buildListingHighlightLabels,
  buildListingPhotoBadges,
} from './listingDisplayHighlights'

describe('buildListingHighlightLabels', () => {
  it('merges inclusion columns and feature names without duplicates', () => {
    const labels = buildListingHighlightLabels({
      furnished: true,
      linen_supplied: false,
      weekly_cleaning_service: true,
      property_features: [
        { features: { name: 'WiFi' } },
        { features: { name: 'Bills included' } },
        { features: { name: 'wifi' } },
      ],
    })
    expect(labels).toEqual(['Furnished', 'Weekly cleaning', 'Bills included', 'WiFi'])
  })
})

describe('buildListingPhotoBadges', () => {
  it('caps photo overlay badges', () => {
    const features = Array.from({ length: 12 }, (_, i) => ({
      features: { name: `Feature ${i + 1}` },
    }))
    const badges = buildListingPhotoBadges({
      featured: true,
      furnished: true,
      property_features: features,
    })
    expect(badges.length).toBe(LISTING_PHOTO_BADGE_MAX)
    expect(badges[0].label).toBe('Featured')
  })
})
