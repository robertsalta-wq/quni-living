import { describe, expect, it } from 'vitest'
import {
  ALLOWED_LEASE_TERMS,
  isPeriodicLeaseLength,
  leaseEndDateFromMoveIn,
} from './leaseEndDate.js'

describe('leaseEndDateFromMoveIn', () => {
  it('maps standard lease lengths from move-in (weeks-based UTC)', () => {
    expect(leaseEndDateFromMoveIn('2026-01-01', '3 months')).toBe('2026-04-02')
    expect(leaseEndDateFromMoveIn('2026-01-01', '6 months')).toBe('2026-07-02')
    expect(leaseEndDateFromMoveIn('2026-01-01', '12 months')).toBe('2026-12-31')
    expect(leaseEndDateFromMoveIn('2026-01-01', '2 years')).toBe('2027-12-30')
  })

  it('returns null for Flexible and invalid dates', () => {
    expect(leaseEndDateFromMoveIn('2026-01-01', 'Flexible')).toBeNull()
    expect(leaseEndDateFromMoveIn('not-a-date', '6 months')).toBeNull()
  })

  it('defaults unknown non-Flexible lengths to 52 weeks', () => {
    expect(leaseEndDateFromMoveIn('2026-01-01', 'custom')).toBe('2026-12-31')
  })
})

describe('isPeriodicLeaseLength', () => {
  it('is true only for Flexible', () => {
    expect(isPeriodicLeaseLength('Flexible')).toBe(true)
    expect(isPeriodicLeaseLength('6 months')).toBe(false)
    expect(isPeriodicLeaseLength(null)).toBe(false)
  })
})

describe('ALLOWED_LEASE_TERMS', () => {
  it('includes 2 years and Flexible', () => {
    expect(ALLOWED_LEASE_TERMS).toContain('2 years')
    expect(ALLOWED_LEASE_TERMS).toContain('Flexible')
  })
})
