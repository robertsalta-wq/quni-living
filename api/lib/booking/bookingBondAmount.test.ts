import { describe, expect, it } from 'vitest'
import {
  bondAmountAtApplyFromProperty,
  parsePropertyBondAud,
  resolveBookingBondAmountAud,
} from './bookingBondAmount.js'

describe('parsePropertyBondAud', () => {
  it('returns null for zero, negative, blank, and non-finite', () => {
    expect(parsePropertyBondAud(0)).toBeNull()
    expect(parsePropertyBondAud(-100)).toBeNull()
    expect(parsePropertyBondAud(null)).toBeNull()
    expect(parsePropertyBondAud('')).toBeNull()
    expect(parsePropertyBondAud(Number.NaN)).toBeNull()
  })

  it('returns positive amounts rounded to cents', () => {
    expect(parsePropertyBondAud(1600)).toBe(1600)
    expect(parsePropertyBondAud('1800.005')).toBe(1800.01)
  })
})

describe('bondAmountAtApplyFromProperty', () => {
  it('returns null when listing bond is unset or zero', () => {
    expect(bondAmountAtApplyFromProperty({ bond: null })).toBeNull()
    expect(bondAmountAtApplyFromProperty({ bond: 0 })).toBeNull()
  })
})

describe('resolveBookingBondAmountAud', () => {
  it('returns null when property bond and booking snapshot are unset (never 4× rent)', () => {
    expect(resolveBookingBondAmountAud(null, null, 450)).toBeNull()
    expect(resolveBookingBondAmountAud(null, 0, 450)).toBeNull()
    expect(resolveBookingBondAmountAud(undefined, undefined, 450)).toBeNull()
  })

  it('prefers a legitimate booking snapshot over property bond', () => {
    expect(resolveBookingBondAmountAud(1200, 1600, 450)).toBe(1200)
  })

  it('uses property bond when booking snapshot is unset', () => {
    expect(resolveBookingBondAmountAud(null, 1600, 450)).toBe(1600)
  })
})
