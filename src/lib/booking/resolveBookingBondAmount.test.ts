import { describe, expect, it } from 'vitest'
import { resolveBookingBondAmountAud, resolveListingBondAud } from './resolveBookingBondAmount'

describe('resolveListingBondAud (client)', () => {
  it('returns null for zero weeks', () => {
    expect(resolveListingBondAud({ bond_weeks: 0 }, 450)).toBeNull()
  })

  it('derives weeks × rent', () => {
    expect(resolveListingBondAud({ bond_weeks: 4 }, 450)).toBe(1800)
  })
})

describe('resolveBookingBondAmountAud (client)', () => {
  it('prefers booking snapshot over listing weeks', () => {
    const prop = { bond_weeks: 4 }
    expect(resolveBookingBondAmountAud(800, prop, 450)).toBe(800)
  })
})
