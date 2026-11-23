import { describe, expect, it } from 'vitest'
import { ft6600BondTenantCount, splitFt6600BondContributionsAud } from './ft6600BondContributions.js'

describe('splitFt6600BondContributionsAud', () => {
  it('gives one tenant the full bond', () => {
    expect(splitFt6600BondContributionsAud(1680, 1)).toEqual([1680])
  })

  it('splits equally and gives leftover cents to tenant 1', () => {
    expect(splitFt6600BondContributionsAud(100.01, 3)).toEqual([33.35, 33.33, 33.33])
  })

  it('uses a stored co-tenant amount when one is supplied', () => {
    expect(splitFt6600BondContributionsAud(1680, 2, [null, 500])).toEqual([1180, 500])
  })

  it('counts only the three contribution lines on the form', () => {
    expect(ft6600BondTenantCount([])).toBe(1)
    expect(ft6600BondTenantCount(['Casey Example'])).toBe(2)
    expect(ft6600BondTenantCount(['A', 'B', 'C'])).toBe(3)
  })
})
