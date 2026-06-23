import { describe, expect, it } from 'vitest'
import {
  bondAmountAtApplyFromProperty,
  maxBondCapAud,
  parsePropertyBondAud,
  recomputeBondForAgreedRent,
  recapFixedBondAud,
  resolveBookingBondAmountAud,
  resolveInviteBondAud,
  resolveListingBondAud,
} from './bookingBondAmount.js'

const weeksProperty = {
  bond_weeks: 4,
  bond_is_fixed: false,
  bond_fixed_amount: null,
}

const fixedProperty = {
  bond_weeks: null,
  bond_is_fixed: true,
  bond_fixed_amount: 1800,
}

describe('resolveListingBondAud', () => {
  it('derives weeks × rent', () => {
    expect(resolveListingBondAud(weeksProperty, 450)).toBe(1800)
  })

  it('returns null for zero weeks', () => {
    expect(resolveListingBondAud({ ...weeksProperty, bond_weeks: 0 }, 450)).toBeNull()
  })

  it('caps fixed bond at four weeks rent', () => {
    expect(resolveListingBondAud(fixedProperty, 400)).toBe(1600)
  })
})

describe('resolveBookingBondAmountAud', () => {
  it('returns null when no snapshot and listing has no bond', () => {
    expect(resolveBookingBondAmountAud(null, { bond_weeks: 0, bond_is_fixed: false }, 450)).toBeNull()
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
})

describe('recomputeBondForAgreedRent', () => {
  it('re-derives weeks bond at agreed rent', () => {
    expect(recomputeBondForAgreedRent(weeksProperty, 1800, 450, 400, {})).toBe(1600)
  })

  it('re-caps fixed bond without proportional scaling', () => {
    expect(
      recomputeBondForAgreedRent(fixedProperty, 1800, 450, 400, {}),
    ).toBe(1600)
  })
})

describe('recapFixedBondAud', () => {
  it('leaves fixed bond when under cap', () => {
    expect(recapFixedBondAud(850, 450)).toBe(850)
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
