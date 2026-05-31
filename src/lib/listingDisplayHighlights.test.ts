import { describe, expect, it } from 'vitest'
import {
  buildListingHighlightLabels,
  buildListingInclusionLabels,
  buildListingPhotoBadges,
} from './listingDisplayHighlights'

describe('buildListingInclusionLabels', () => {
  it('returns inclusion signals only', () => {
    const labels = buildListingInclusionLabels({
      furnished: true,
      linen_supplied: true,
      property_features: [
        { features: { name: 'WiFi' } },
        { features: { name: 'Dishwasher' } },
        { features: { name: 'Bills included' } },
      ],
    })
    expect(labels).toEqual(['Furnished', 'Linen supplied', 'Bills included'])
    expect(labels).not.toContain('WiFi')
    expect(labels).not.toContain('Dishwasher')
  })
})

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
  it('never puts amenity features on the photo', () => {
    const features = Array.from({ length: 12 }, (_, i) => ({
      features: { name: `Feature ${i + 1}` },
    }))
    const badges = buildListingPhotoBadges({
      featured: true,
      furnished: true,
      linen_supplied: true,
      property_features: features,
    })
    expect(badges.map((b) => b.label)).toEqual(['Featured', 'Furnished', 'Linen supplied'])
  })
})
