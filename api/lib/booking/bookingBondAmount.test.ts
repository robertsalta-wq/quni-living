import { describe, expect, it } from 'vitest'
import {
  bondAmountAtApplyFromProperty,
  maxBondCapAud,
  parsePropertyBondAud,
  recomputeBondForAgreedRent,
  resolveBookingBondAmountAud,
  resolveInviteBondAud,
  resolveListingBondAud,
} from './bookingBondAmount.js'

const weeksProperty = {
  bond_weeks: 4,
}

describe('resolveListingBondAud', () => {
  it('derives weeks × rent', () => {
    expect(resolveListingBondAud(weeksProperty, 450)).toBe(1800)
  })

  it('returns null for zero weeks', () => {
    expect(resolveListingBondAud({ bond_weeks: 0 }, 450)).toBeNull()
  })
})

describe('resolveBookingBondAmountAud', () => {
  it('returns null when no snapshot and listing has no bond', () => {
    expect(resolveBookingBondAmountAud(null, { bond_weeks: 0 }, 450)).toBeNull()
  })

  it('prefers booking snapshot', () => {
    expect(resolveBookingBondAmountAud(1200, weeksProperty, 450)).toBe(1200)
  })

  it('derives from listing weeks when snapshot unset', () => {
    expect(resolveBookingBondAmountAud(null, weeksProperty, 450)).toBe(1800)
  })
})

describe('bondAmountAtApplyFromProperty', () => {
  it('uses invite bond weeks override', () => {
    expect(
      bondAmountAtApplyFromProperty(weeksProperty, 400, { offered_bond_weeks: 2 }),
    ).toBe(800)
  })
})

describe('resolveInviteBondAud', () => {
  it('scales weeks bond with offered rent', () => {
    expect(
      resolveInviteBondAud(weeksProperty, { offered_weekly_rent: 400, offered_bond_weeks: 4 }, 400),
    ).toBe(1600)
  })

  it('returns null for zero weeks override', () => {
    expect(resolveInviteBondAud(weeksProperty, { offered_bond_weeks: 0 }, 400)).toBeNull()
  })
})

describe('recomputeBondForAgreedRent', () => {
  it('re-derives weeks bond at agreed rent', () => {
    expect(recomputeBondForAgreedRent(weeksProperty, 1800, 450, 400, {})).toBe(1600)
  })

  it('returns null when effective weeks is zero', () => {
    expect(
      recomputeBondForAgreedRent({ bond_weeks: 0 }, null, 450, 400, {}),
    ).toBeNull()
  })
})

describe('maxBondCapAud', () => {
  it('is four weeks of rent', () => {
    expect(maxBondCapAud(400)).toBe(1600)
  })
})

describe('parsePropertyBondAud', () => {
  it('returns null for zero', () => {
    expect(parsePropertyBondAud(0)).toBeNull()
  })
})
