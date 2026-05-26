import { describe, expect, it } from 'vitest'
import { buildGeocodeQueryCandidates } from './normalizeAustralianAddressForGeocode'

describe('buildGeocodeQueryCandidates', () => {
  it('expands unit slash and highway abbreviation', () => {
    const candidates = buildGeocodeQueryCandidates('401/311 Hume Hwy', 'Liverpool', 'NSW', '2170')
    expect(candidates.length).toBeGreaterThanOrEqual(2)
    expect(candidates.some((q) => q.includes('Unit 401'))).toBe(true)
    expect(candidates.some((q) => q.includes('Highway'))).toBe(true)
  })

  it('returns empty when required fields missing', () => {
    expect(buildGeocodeQueryCandidates('1 Main St', '', 'NSW', '2000')).toEqual([])
  })
})
