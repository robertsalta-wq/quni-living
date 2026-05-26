import { describe, expect, it } from 'vitest'
import { buildGeocodeQueryCandidates, streetLineForGeocode } from './normalizeAustralianAddressForGeocode'

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
