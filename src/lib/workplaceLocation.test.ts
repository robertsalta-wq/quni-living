import { describe, expect, it } from 'vitest'
import {
  parseNearRadiusKm,
  parseNearSearchAnchor,
  workplaceGeocodeQueries,
} from './workplaceLocation'

describe('parseNearSearchAnchor', () => {
  it('parses valid Sydney coords', () => {
    const a = parseNearSearchAnchor('-33.8688', '151.2093', '15')
    expect(a).toEqual({ lat: -33.8688, lon: 151.2093, radiusKm: 15 })
  })

  it('rejects invalid', () => {
    expect(parseNearSearchAnchor('x', '151')).toBeNull()
  })
})

describe('parseNearRadiusKm', () => {
  it('defaults invalid to 15', () => {
    expect(parseNearRadiusKm('')).toBe(15)
    expect(parseNearRadiusKm('nope')).toBe(15)
  })

  it('accepts allowed options', () => {
    expect(parseNearRadiusKm('5')).toBe(5)
    expect(parseNearRadiusKm('25')).toBe(25)
  })
})

describe('workplaceGeocodeQueries', () => {
  it('builds suburb query when no street', () => {
    const qs = workplaceGeocodeQueries({
      suburb: 'Parramatta',
      state: 'NSW',
      postcode: '2150',
    })
    expect(qs[0]).toContain('Parramatta')
    expect(qs[0]).toContain('Australia')
  })
})
