import { describe, expect, it } from 'vitest'
import { inclusiveLeaseLastDay, leaseEndDateFromMoveIn } from './leaseEndDate.js'

/** NSW occupancy effective term end: Flexible and unknown lengths stay open. */
function effectiveNswOccupancyEndDate(moveInIso: string, leaseLength: string | null): string | null {
  const endDate = leaseEndDateFromMoveIn(moveInIso, leaseLength)
  const periodic = leaseLength === 'Flexible' || endDate == null
  return periodic ? null : endDate
}

const NSW_OCCUPANCY_FIXTURES: Array<{
  moveIn: string
  leaseLength: string | null
  exclusiveEnd: string | null
}> = [
  { moveIn: '2026-03-15', leaseLength: '3 months', exclusiveEnd: '2026-06-15' },
  { moveIn: '2026-07-01', leaseLength: '6 months', exclusiveEnd: '2027-01-01' },
  { moveIn: '2026-01-01', leaseLength: '12 months', exclusiveEnd: '2027-01-01' },
  { moveIn: '2026-09-20', leaseLength: 'Flexible', exclusiveEnd: null },
  { moveIn: '2026-05-10', leaseLength: null, exclusiveEnd: null },
  { moveIn: '2026-11-30', leaseLength: '6 months', exclusiveEnd: '2027-05-30' },
]

describe('nswOccupancy lease end-date (calendar months)', () => {
  it('uses the shared exclusive end for every fixture term', () => {
    for (const { moveIn, leaseLength, exclusiveEnd } of NSW_OCCUPANCY_FIXTURES) {
      expect(leaseEndDateFromMoveIn(moveIn, leaseLength)).toBe(exclusiveEnd)
      expect(effectiveNswOccupancyEndDate(moveIn, leaseLength)).toBe(exclusiveEnd)
      if (exclusiveEnd) {
        expect(inclusiveLeaseLastDay(exclusiveEnd)).toBe(
          new Date(Date.parse(`${exclusiveEnd}T00:00:00Z`) - 86400000).toISOString().slice(0, 10),
        )
      }
    }
  })
})
