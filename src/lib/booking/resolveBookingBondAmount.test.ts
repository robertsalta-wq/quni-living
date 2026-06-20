import { describe, expect, it } from 'vitest'

import { resolveBookingBondAmountAud } from './resolveBookingBondAmount'

describe('dashboard bond resolution (resolveBookingBondAmountAud)', () => {
  it('returns null for no-bond listings — never 4× weekly rent', () => {
    expect(resolveBookingBondAmountAud(null, null, 450)).toBeNull()
    expect(resolveBookingBondAmountAud(null, 0, 450)).toBeNull()
    expect(resolveBookingBondAmountAud(undefined, undefined, 450)).toBeNull()
  })

  it('prefers booking snapshot over property bond', () => {
    expect(resolveBookingBondAmountAud(1200, 1600, 400)).toBe(1200)
  })

  it('falls back to property bond when booking snapshot is unset', () => {
    expect(resolveBookingBondAmountAud(null, 1600, 400)).toBe(1600)
  })
})
