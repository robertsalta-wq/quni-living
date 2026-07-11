import { describe, expect, it } from 'vitest'
import { leaseEndDateFromMoveIn } from './leaseEndDate.js'

/** Exact copy of nswOccupancy.ts local helper before Stage 1 extraction. */
function legacyNswOccupancyLeaseEndDateFromMoveIn(
  moveInIso: string,
  leaseLength: string | null,
): string | null {
  const raw = moveInIso.slice(0, 10)
  const [y, m, d] = raw.split('-').map(Number)
  if (!y || !m || !d) return null
  const start = new Date(Date.UTC(y, m - 1, d))
  let weeks = 52
  if (leaseLength === '3 months') weeks = 13
  else if (leaseLength === '6 months') weeks = 26
  else if (leaseLength === '12 months') weeks = 52
  else if (leaseLength === 'Flexible') weeks = 104
  const end = new Date(start.getTime() + weeks * 7 * 86400000)
  return end.toISOString().slice(0, 10)
}

/** nswOccupancy loadNswOccupancyContext effective term end (periodic → null). */
function effectiveNswOccupancyEndDate(moveInIso: string, leaseLength: string | null): string | null {
  const endDate = leaseEndDateFromMoveIn(moveInIso, leaseLength)
  const periodic = leaseLength === 'Flexible' || endDate == null
  return periodic ? null : endDate
}

function effectiveLegacyNswOccupancyEndDate(moveInIso: string, leaseLength: string | null): string | null {
  const endDate = legacyNswOccupancyLeaseEndDateFromMoveIn(moveInIso, leaseLength)
  const periodic = leaseLength === 'Flexible' || endDate == null
  return periodic ? null : endDate
}

/** Representative NSW occupancy booking move-in / lease_length pairs. */
const NSW_OCCUPANCY_FIXTURES: Array<{ moveIn: string; leaseLength: string | null }> = [
  { moveIn: '2026-03-15', leaseLength: '3 months' },
  { moveIn: '2026-07-01', leaseLength: '6 months' },
  { moveIn: '2026-01-01', leaseLength: '12 months' },
  { moveIn: '2026-09-20', leaseLength: 'Flexible' },
  { moveIn: '2026-05-10', leaseLength: null },
  { moveIn: '2026-11-30', leaseLength: '6 months' },
]

describe('nswOccupancy lease end-date parity (Stage 1 merge gate)', () => {
  it('raw helper matches legacy for non-Flexible NSW occupancy terms', () => {
    for (const { moveIn, leaseLength } of NSW_OCCUPANCY_FIXTURES) {
      if (leaseLength === 'Flexible') continue
      expect(leaseEndDateFromMoveIn(moveIn, leaseLength)).toBe(
        legacyNswOccupancyLeaseEndDateFromMoveIn(moveIn, leaseLength),
      )
    }
  })

  it('effective PDF/tenancy end_date matches legacy for all fixture terms', () => {
    for (const { moveIn, leaseLength } of NSW_OCCUPANCY_FIXTURES) {
      expect(effectiveNswOccupancyEndDate(moveIn, leaseLength)).toBe(
        effectiveLegacyNswOccupancyEndDate(moveIn, leaseLength),
      )
    }
  })
})
