import { describe, expect, it, vi } from 'vitest'
import {
  ADDRESS_NOT_MATCHED_MESSAGE,
  SUBURB_ONLY_MATCH_MESSAGE,
  campusActionWhenAddressChanges,
  campusSearchRequiredBeforeSave,
  firstAgreedGeocode,
  geocodeAgreesWithEnteredAddress,
  geocodeMatchPrecision,
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
    expect(result).toEqual({ ok: true, lat: -33.9, lon: 150.9, precision: 'suburb' })
  })

  it('prefers a house hit over an earlier suburb centroid that echoes the same suburb', async () => {
    const lookup = vi.fn(async (query: string) => {
      if (/^311 Hume Highway/i.test(query)) {
        return {
          lat: -33.92,
          lon: 150.92,
          address: liverpool,
          kind: { resultClass: 'building', resultType: 'house', addressType: 'house' },
        }
      }
      return {
        lat: -33.9,
        lon: 150.9,
        address: liverpool,
        kind: { resultClass: 'place', resultType: 'suburb', addressType: 'suburb' },
      }
    })
    const result = await firstAgreedGeocode(
      { address: 'Unit 401, 311 Hume Highway', suburb: 'Liverpool', state: 'NSW', postcode: '2170' },
      lookup,
    )
    expect(result).toEqual({ ok: true, lat: -33.92, lon: 150.92, precision: 'street' })
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

describe('geocodeMatchPrecision', () => {
  it('treats a house or road as a street and a suburb or missing type as a centroid', () => {
    expect(geocodeMatchPrecision({ resultClass: 'building', resultType: 'house', addressType: 'house' })).toBe(
      'street',
    )
    expect(geocodeMatchPrecision({ resultClass: 'highway', resultType: 'residential' })).toBe('street')
    expect(geocodeMatchPrecision({ resultClass: 'place', resultType: 'suburb', addressType: 'suburb' })).toBe(
      'suburb',
    )
    expect(geocodeMatchPrecision({ resultClass: 'boundary', addressType: 'administrative' })).toBe('suburb')
    expect(geocodeMatchPrecision(null)).toBe('suburb')
    expect(SUBURB_ONLY_MATCH_MESSAGE).toBe('We matched the suburb, not the exact street')
  })
})

describe('campusSearchRequiredBeforeSave', () => {
  const base = {
    currentSig: '12 smith st|liverpool|nsw|2170',
    loadedSig: '',
    acceptedSig: '',
    resultsShownSig: '',
    addressComplete: true,
  }

  it('saves an unchanged loaded address without searching', () => {
    expect(
      campusSearchRequiredBeforeSave({
        ...base,
        loadedSig: base.currentSig,
      }),
    ).toBe('save')
  })

  it('searches a complete address that has not been shown yet', () => {
    expect(campusSearchRequiredBeforeSave(base)).toBe('search')
  })

  it('saves after the landlord has already searched this address', () => {
    expect(
      campusSearchRequiredBeforeSave({
        ...base,
        acceptedSig: base.currentSig,
      }),
    ).toBe('save')
  })

  it('treats a second save as confirmation after the results were shown', () => {
    expect(
      campusSearchRequiredBeforeSave({
        ...base,
        resultsShownSig: base.currentSig,
      }),
    ).toBe('confirm')
  })

  it('does not search an incomplete address', () => {
    expect(campusSearchRequiredBeforeSave({ ...base, addressComplete: false })).toBe('save')
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
