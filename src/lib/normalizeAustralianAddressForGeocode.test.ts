import { describe, expect, it } from 'vitest'
import {
  buildGeocodeQueryCandidates,
  composeStreetLine,
  splitUnitFromStreetLine,
  streetLineForGeocode,
} from './normalizeAustralianAddressForGeocode'

describe('streetLineForGeocode', () => {
  it('strips Unit prefix for Quinn-style address', () => {
    expect(streetLineForGeocode('Unit 406, 311 hume highway')).toBe('311 hume highway')
  })

  it('uses street number after unit slash', () => {
    expect(streetLineForGeocode('401/311 Hume Hwy')).toBe('311 Hume Highway')
  })

  it('returns expanded line when no unit', () => {
    expect(streetLineForGeocode('311 Hume Highway')).toBe('311 Hume Highway')
  })
})

describe('splitUnitFromStreetLine', () => {
  const street = '244 Buffalo Road'

  it('splits a Unit comma line and leaves a slash unit on the street', () => {
    expect(splitUnitFromStreetLine('Unit 401, 311 Hume Highway')).toEqual({
      unit: 'Unit 401',
      street: '311 Hume Highway',
    })
    expect(splitUnitFromStreetLine('4/12 Smith Street')).toEqual({
      unit: '',
      street: '4/12 Smith Street',
    })
    expect(composeStreetLine('401', '311 Hume Highway')).toBe('Unit 401, 311 Hume Highway')
    expect(composeStreetLine('', '4/12 Smith Street')).toBe('4/12 Smith Street')
    expect(composeStreetLine('Unit 401', '311 Hume Highway')).toBe('Unit 401, 311 Hume Highway')
  })

  it('composes each typed unit once and splits that clause back out', () => {
    const cases: { typed: string; storedUnit: string }[] = [
      { typed: '1', storedUnit: 'Unit 1' },
      { typed: 'Unit 1', storedUnit: 'Unit 1' },
      { typed: 'Apt 1', storedUnit: 'Apt 1' },
      { typed: 'Apartment 1', storedUnit: 'Apartment 1' },
      { typed: 'Shop 1', storedUnit: 'Shop 1' },
      { typed: 'Suite 1', storedUnit: 'Suite 1' },
      { typed: 'Flat 1', storedUnit: 'Flat 1' },
      { typed: 'Level 2', storedUnit: 'Level 2' },
      { typed: 'U1', storedUnit: 'Unit U1' },
    ]
    for (const { typed, storedUnit } of cases) {
      const stored = `${storedUnit}, ${street}`
      expect(composeStreetLine(typed, street)).toBe(stored)
      expect(splitUnitFromStreetLine(stored)).toEqual({ unit: storedUnit, street })
      expect(composeStreetLine(storedUnit, street)).toBe(stored)
    }
  })

  it('heals a doubled Unit prefix back into the unit field', () => {
    expect(splitUnitFromStreetLine('Unit Unit 1, 244 Buffalo Road')).toEqual({
      unit: 'Unit 1',
      street: '244 Buffalo Road',
    })
    expect(composeStreetLine('Unit Unit 1', '244 Buffalo Road')).toBe('Unit 1, 244 Buffalo Road')
    expect(streetLineForGeocode('Unit Unit 1, 244 Buffalo Road')).toBe('244 Buffalo Road')
    expect(streetLineForGeocode('Apt 1, 244 Buffalo Road')).toBe('244 Buffalo Road')
    expect(streetLineForGeocode('Level 2, 244 Buffalo Road')).toBe('244 Buffalo Road')
  })
})

describe('buildGeocodeQueryCandidates', () => {
  it('expands unit slash and highway abbreviation', () => {
    const candidates = buildGeocodeQueryCandidates('401/311 Hume Hwy', 'Liverpool', 'NSW', '2170')
    expect(candidates.length).toBeGreaterThanOrEqual(2)
    expect(candidates.some((q) => q.includes('Unit 401'))).toBe(true)
    expect(candidates.some((q) => q.includes('311 Hume Highway'))).toBe(true)
  })

  it('includes street-only fallback for Unit X, street line', () => {
    const candidates = buildGeocodeQueryCandidates(
      'Unit 406, 311 hume highway',
      'Liverpool',
      'NSW',
      '2170',
    )
    expect(candidates[0]).toContain('Unit 406')
    expect(candidates.some((q) => /311 hume highway, Liverpool/i.test(q))).toBe(true)
    expect(candidates.some((q) => !/Unit 406/i.test(q) && /311 hume highway/i.test(q))).toBe(true)
  })

  it('returns empty when required fields missing', () => {
    expect(buildGeocodeQueryCandidates('1 Main St', '', 'NSW', '2000')).toEqual([])
  })
})
