import { describe, expect, it, vi } from 'vitest'
import {
  ADDRESS_NOT_MATCHED_MESSAGE,
  campusActionWhenAddressChanges,
  firstAgreedGeocode,
  geocodeAgreesWithEnteredAddress,
  type GeocoderLocality,
} from './geocodeAddressAgreement'

const liverpool: GeocoderLocality = {
  suburb: 'Liverpool',
  city: 'Sydney',
  postcode: '2170',
  state: 'New South Wales',
  stateCode: 'AU-NSW',
}

describe('geocodeAgreesWithEnteredAddress', () => {
  it('accepts the same suburb, postcode, and state', () => {
    expect(
      geocodeAgreesWithEnteredAddress(
        { suburb: 'Liverpool', postcode: '2170', state: 'NSW' },
        liverpool,
      ),
    ).toBe(true)
  })

  it('accepts Saint and St as the same suburb', () => {
    expect(
      geocodeAgreesWithEnteredAddress(
        { suburb: 'Saint Kilda', postcode: '3182', state: 'VIC' },
        { suburb: 'St Kilda', city: 'Melbourne', postcode: '3182', state: 'Victoria' },
      ),
    ).toBe(true)
  })

  it('rejects a different suburb even when the city is Sydney', () => {
    expect(
      geocodeAgreesWithEnteredAddress(
        { suburb: 'Warwick Farm', postcode: '2170', state: 'NSW' },
        liverpool,
      ),
    ).toBe(false)
  })

  it('rejects a different postcode or state', () => {
    expect(
      geocodeAgreesWithEnteredAddress(
        { suburb: 'Liverpool', postcode: '2171', state: 'NSW' },
        liverpool,
      ),
    ).toBe(false)
    expect(
      geocodeAgreesWithEnteredAddress(
        { suburb: 'Liverpool', postcode: '2170', state: 'VIC' },
        liverpool,
      ),
    ).toBe(false)
  })

  it('uses the town when Nominatim has no suburb', () => {
    expect(
      geocodeAgreesWithEnteredAddress(
        { suburb: 'Ballarat', postcode: '3350', state: 'VIC' },
        { town: 'Ballarat', city: 'Ballarat', postcode: '3350', stateCode: 'AU-VIC' },
      ),
    ).toBe(true)
  })

  it('does not treat a missing locality as a match', () => {
    expect(
      geocodeAgreesWithEnteredAddress(
        { suburb: 'Liverpool', postcode: '2170', state: 'NSW' },
        { postcode: '2170', state: 'New South Wales' },
      ),
    ).toBe(false)
  })
})

describe('firstAgreedGeocode', () => {
  it('skips a hit in another suburb and uses a later query that matches', async () => {
    const lookup = vi.fn(async (query: string) => {
      if (/311 Hume Highway/i.test(query) && !/Unit 401/i.test(query) && !query.includes('401/311')) {
        return { lat: -33.9, lon: 150.9, address: liverpool }
      }
      return {
        lat: 1,
        lon: 2,
        address: { suburb: 'Parramatta', city: 'Sydney', postcode: '2150', state: 'New South Wales' },
      }
    })
    const result = await firstAgreedGeocode(
      { address: '401/311 Hume Hwy', suburb: 'Liverpool', state: 'NSW', postcode: '2170' },
      lookup,
    )
    expect(result).toEqual({ ok: true, lat: -33.9, lon: 150.9 })
  })

  it('returns mismatch when every hit disagrees with the entered suburb', async () => {
    const result = await firstAgreedGeocode(
      { address: '12 Other St', suburb: 'Liverpool', state: 'NSW', postcode: '2170' },
      async () => ({ lat: 1, lon: 2, address: { suburb: 'Parramatta', postcode: '2170', state: 'New South Wales' } }),
    )
    expect(result).toEqual({ ok: false, reason: 'mismatch' })
    expect(ADDRESS_NOT_MATCHED_MESSAGE).toBe(
      "We couldn't match this address, check the suburb and postcode",
    )
  })

  it('returns not_found when the geocoder has no hit', async () => {
    const result = await firstAgreedGeocode(
      { address: '12 Missing St', suburb: 'Liverpool', state: 'NSW', postcode: '2170' },
      async () => null,
    )
    expect(result).toEqual({ ok: false, reason: 'not_found' })
  })
})

describe('campusActionWhenAddressChanges', () => {
  it('clears an automatic choice and keeps a landlord or saved choice', () => {
    expect(campusActionWhenAddressChanges('auto')).toBe('clear')
    expect(campusActionWhenAddressChanges('landlord')).toBe('keep')
    expect(campusActionWhenAddressChanges('saved')).toBe('keep')
    expect(campusActionWhenAddressChanges('none')).toBe('keep')
  })
})
