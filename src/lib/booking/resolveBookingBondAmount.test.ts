import { describe, expect, it } from 'vitest'

import { resolveBookingBondAmountAud } from './resolveBookingBondAmount'

describe('dashboard bond resolution (resolveBookingBondAmountAud)', () => {
  it('returns null for no-bond listings', () => {
    const prop = { bond_weeks: 0, bond_is_fixed: false, bond_fixed_amount: null }
    expect(resolveBookingBondAmountAud(null, prop, 450)).toBeNull()
  })

  it('prefers booking snapshot over listing bond', () => {
    const prop = { bond_weeks: 4, bond_is_fixed: false, bond_fixed_amount: null }
    expect(resolveBookingBondAmountAud(1200, prop, 400)).toBe(1200)
  })

  it('derives from listing weeks when booking snapshot is unset', () => {
    const prop = { bond_weeks: 4, bond_is_fixed: false, bond_fixed_amount: null }
    expect(resolveBookingBondAmountAud(null, prop, 400)).toBe(1600)
  })
})
