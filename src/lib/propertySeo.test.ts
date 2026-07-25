import { describe, expect, it } from 'vitest'
import type { Property } from './listings'
import { propertyListingJsonLd } from './propertySeo'

function baseProperty(over: Partial<Property> = {}): Property {
  return {
    id: 'p1',
    title: 'Sunny room near campus',
    rent_per_week: 350,
    slug: 'sunny-room',
    suburb: 'Camperdown',
    state: 'NSW',
    postcode: '2050',
    address: null,
    latitude: -33.88,
    longitude: 151.18,
    images: [],
    bedrooms: 1,
    room_type: 'single',
    landlord_profiles: null,
    universities: null,
    campuses: null,
    ...over,
  } as Property
}

describe('propertyListingJsonLd', () => {
  it('emits Accommodation Offer with weekly AUD price and room fields when present', () => {
    const [accommodation] = propertyListingJsonLd(baseProperty(), 'sunny-room', {
      campusDisplay: 'University of Sydney',
      roomLabel: 'Single room',
    })
    expect(accommodation['@type']).toBe('Accommodation')
    expect(accommodation.numberOfRooms).toBe(1)
    expect(accommodation.accommodationCategory).toBe('Single room')
    expect(accommodation.offers).toMatchObject({
      '@type': 'Offer',
      priceCurrency: 'AUD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        unitText: 'WEEK',
        priceCurrency: 'AUD',
      },
    })
  })

  it('omits numberOfRooms when bedrooms is missing', () => {
    const [accommodation] = propertyListingJsonLd(baseProperty({ bedrooms: null }), 'sunny-room', {
      campusDisplay: null,
      roomLabel: null,
    })
    expect(accommodation.numberOfRooms).toBeUndefined()
  })
})
