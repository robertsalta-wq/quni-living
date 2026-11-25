import { describe, expect, it } from 'vitest'
import { firstAgreedGoogleAddress, parseGoogleAddressResult } from './googlePlaceAddress'

const place = {
  formattedAddress: 'Unit 401, 311 Hume Highway, Liverpool NSW 2170, Australia',
  types: ['subpremise'],
  location: { latitude: -33.92, longitude: 150.92 },
  addressComponents: [
    { longText: '401', shortText: '401', types: ['subpremise'] },
    { longText: '311', shortText: '311', types: ['street_number'] },
    { longText: 'Hume Highway', shortText: 'Hume Hwy', types: ['route'] },
    { longText: 'Liverpool', shortText: 'Liverpool', types: ['locality', 'political'] },
    { longText: 'New South Wales', shortText: 'NSW', types: ['administrative_area_level_1', 'political'] },
    { longText: '2170', shortText: '2170', types: ['postal_code'] },
  ],
}

describe('parseGoogleAddressResult', () => {
  it('puts the unit on the existing street line and reads Places coordinates', () => {
    const parsed = parseGoogleAddressResult(place)
    expect(parsed).toMatchObject({
      streetLine: 'Unit 401, 311 Hume Highway',
      suburb: 'Liverpool',
      state: 'NSW',
      postcode: '2170',
      lat: -33.92,
      lon: 150.92,
      precision: 'street',
    })
  })

  it('reads a Geocoding API result and marks a locality as suburb-only', () => {
    const parsed = parseGoogleAddressResult({
      formatted_address: 'Liverpool NSW 2170, Australia',
      types: ['locality', 'political'],
      geometry: { location: { lat: -33.92, lng: 150.92 } },
      address_components: [
        { long_name: 'Liverpool', short_name: 'Liverpool', types: ['locality', 'political'] },
        { long_name: 'New South Wales', short_name: 'NSW', types: ['administrative_area_level_1'] },
        { long_name: '2170', short_name: '2170', types: ['postal_code'] },
      ],
    })
    expect(parsed?.precision).toBe('suburb')
    expect(parsed?.streetLine).toBe('')
    expect(parsed?.state).toBe('NSW')
  })
})

describe('firstAgreedGoogleAddress', () => {
  it('skips a suburb centroid when a later result matches the street', () => {
    const suburb = {
      formatted_address: 'Liverpool NSW 2170, Australia',
      types: ['locality'],
      geometry: { location: { lat: -33.9, lng: 150.9 } },
      address_components: [
        { long_name: 'Liverpool', short_name: 'Liverpool', types: ['locality'] },
        { long_name: 'NSW', short_name: 'NSW', types: ['administrative_area_level_1'] },
        { long_name: '2170', short_name: '2170', types: ['postal_code'] },
      ],
    }
    const chosen = firstAgreedGoogleAddress([suburb, place], {
      suburb: 'Liverpool',
      state: 'NSW',
      postcode: '2170',
    })
    expect(chosen?.streetLine).toBe('Unit 401, 311 Hume Highway')
    expect(chosen?.precision).toBe('street')
  })

  it('rejects a result in a different suburb', () => {
    const chosen = firstAgreedGoogleAddress([place], {
      suburb: 'Parramatta',
      state: 'NSW',
      postcode: '2150',
    })
    expect(chosen).toBeNull()
  })
})
