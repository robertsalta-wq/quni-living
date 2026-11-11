import { describe, expect, it } from 'vitest'
import {
  ALLOWED_LEASE_TERMS,
  addCalendarMonths,
  inclusiveLeaseLastDay,
  isPeriodicLeaseLength,
  leaseDatesForBooking,
  leaseEndDateFromMoveIn,
} from './leaseEndDate.js'

describe('leaseEndDateFromMoveIn', () => {
  it('stores the exclusive end as start plus N calendar months', () => {
    expect(leaseEndDateFromMoveIn('2026-12-28', '3 months')).toBe('2027-03-28')
    expect(leaseEndDateFromMoveIn('2026-01-01', '3 months')).toBe('2026-04-01')
    expect(leaseEndDateFromMoveIn('2026-01-01', '6 months')).toBe('2026-07-01')
    expect(leaseEndDateFromMoveIn('2026-01-01', '12 months')).toBe('2027-01-01')
    expect(leaseEndDateFromMoveIn('2026-07-01', '12 months')).toBe('2027-07-01')
    expect(leaseEndDateFromMoveIn('2026-01-01', '2 years')).toBe('2028-01-01')
  })

  it('clamps when the target month is shorter than the start day', () => {
    expect(addCalendarMonths('2027-01-31', 1)).toBe('2027-02-28')
    expect(addCalendarMonths('2024-01-31', 1)).toBe('2024-02-29')
    expect(leaseEndDateFromMoveIn('2027-01-31', '3 months')).toBe('2027-04-30')
  })

  it('returns null for Flexible, unknown lengths, and invalid dates', () => {
    expect(leaseEndDateFromMoveIn('2026-01-01', 'Flexible')).toBeNull()
    expect(leaseEndDateFromMoveIn('2026-01-01', 'custom')).toBeNull()
    expect(leaseEndDateFromMoveIn('2026-01-01', null)).toBeNull()
    expect(leaseEndDateFromMoveIn('not-a-date', '6 months')).toBeNull()
  })
})

describe('inclusiveLeaseLastDay', () => {
  it('is the day before the exclusive end', () => {
    expect(inclusiveLeaseLastDay('2027-03-28')).toBe('2027-03-27')
    expect(inclusiveLeaseLastDay('2027-02-28')).toBe('2027-02-27')
    expect(inclusiveLeaseLastDay(null)).toBeNull()
  })
})

describe('leaseDatesForBooking', () => {
  it('prefers a stored exclusive end and prints the inclusive last day', () => {
    expect(
      leaseDatesForBooking({
        moveInIso: '2026-12-28',
        leaseLength: '3 months',
        storedExclusiveEnd: '2027-03-30',
      }),
    ).toEqual({ exclusiveEnd: '2027-03-30', printedLastDay: '2027-03-29', periodic: false })
  })

  it('computes a new exclusive end when nothing is stored', () => {
    expect(
      leaseDatesForBooking({ moveInIso: '2026-12-28', leaseLength: '3 months', storedExclusiveEnd: null }),
    ).toEqual({ exclusiveEnd: '2027-03-28', printedLastDay: '2027-03-27', periodic: false })
  })

  it('leaves Flexible open', () => {
    expect(leaseDatesForBooking({ moveInIso: '2026-12-28', leaseLength: 'Flexible' })).toEqual({
      exclusiveEnd: null,
      printedLastDay: null,
      periodic: true,
    })
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
