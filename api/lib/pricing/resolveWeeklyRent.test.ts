import { describe, expect, it } from 'vitest'

import {
  ResolveWeeklyRentError,
  maxWeeklyRentForProperty,
  propertyHasVariableOccupancyPricing,
  resolveWeeklyRent,
} from './resolveWeeklyRent.js'

const casaRoom = {
  rent_per_week: 400,
  max_occupants: 2,
  couple_surcharge_per_week: 100,
  parking_surcharge_per_week: 50,
  parking_available: true,
}

describe('resolveWeeklyRent', () => {
  it('sole occupant - base rent only', () => {
    expect(resolveWeeklyRent(casaRoom, { occupantCount: 1 })).toEqual({
      weeklyRent: 400,
      weeklyRentCents: 40_000,
      breakdownAud: { base: 400 },
      breakdownCents: { base: 40_000 },
    })
  })

  it('couple - base + couple surcharge', () => {
    expect(resolveWeeklyRent(casaRoom, { occupantCount: 2 })).toEqual({
      weeklyRent: 500,
      weeklyRentCents: 50_000,
      breakdownAud: { base: 400, couple: 100 },
      breakdownCents: { base: 40_000, couple: 10_000 },
    })
  })

  it('sole + parking', () => {
    expect(resolveWeeklyRent(casaRoom, { occupantCount: 1, parkingSelected: true })).toEqual({
      weeklyRent: 450,
      weeklyRentCents: 45_000,
      breakdownAud: { base: 400, parking: 50 },
      breakdownCents: { base: 40_000, parking: 5000 },
    })
  })

  it('couple + parking - full stack', () => {
    expect(
      resolveWeeklyRent(casaRoom, { occupantCount: 2, parkingSelected: true }),
    ).toEqual({
      weeklyRent: 550,
      weeklyRentCents: 55_000,
      breakdownAud: { base: 400, couple: 100, parking: 50 },
      breakdownCents: { base: 40_000, couple: 10_000, parking: 5000 },
    })
  })

  it('null surcharges - legacy listing behaves as base rent only', () => {
    const legacy = {
      rent_per_week: 350,
      max_occupants: 1,
      couple_surcharge_per_week: null,
      parking_surcharge_per_week: null,
      parking_available: false,
    }
    expect(resolveWeeklyRent(legacy, { occupantCount: 1, parkingSelected: false })).toMatchObject({
      weeklyRent: 350,
      breakdownAud: { base: 350 },
    })
    expect(() =>
      resolveWeeklyRent(legacy, { occupantCount: 1, parkingSelected: true }),
    ).toThrow(ResolveWeeklyRentError)
  })

  it('max_occupants enforcement - rejects third occupant', () => {
    expect(() => resolveWeeklyRent(casaRoom, { occupantCount: 3 })).toThrow(ResolveWeeklyRentError)
    try {
      resolveWeeklyRent(casaRoom, { occupantCount: 3 })
    } catch (e) {
      expect(e).toBeInstanceOf(ResolveWeeklyRentError)
      expect((e as ResolveWeeklyRentError).code).toBe('OCCUPANTS_EXCEED_MAX')
    }
  })

  it('max_occupants 1 - rejects couple even with surcharge configured', () => {
    const singleOnly = { ...casaRoom, max_occupants: 1 }
    expect(() => resolveWeeklyRent(singleOnly, { occupantCount: 2 })).toThrow(
      /at most 1 occupant/,
    )
  })

  it('parking not available - rejects parkingSelected', () => {
    const noPark = { ...casaRoom, parking_available: false }
    expect(() =>
      resolveWeeklyRent(noPark, { occupantCount: 1, parkingSelected: true }),
    ).toThrow(ResolveWeeklyRentError)
    try {
      resolveWeeklyRent(noPark, { occupantCount: 1, parkingSelected: true })
    } catch (e) {
      expect((e as ResolveWeeklyRentError).code).toBe('PARKING_NOT_AVAILABLE')
    }
  })

  it('invalid base rent', () => {
    expect(() =>
      resolveWeeklyRent({ rent_per_week: -1, max_occupants: 1 }, { occupantCount: 1 }),
    ).toThrow(/Invalid base weekly rent/)
  })

  it('invalid occupant count', () => {
    expect(() => resolveWeeklyRent(casaRoom, { occupantCount: 0 })).toThrow(/at least 1/)
  })

  it('couple with zero surcharge - base only for two occupants', () => {
    const noCoupleFee = {
      rent_per_week: 400,
      max_occupants: 2,
      couple_surcharge_per_week: 0,
      parking_available: false,
    }
    expect(resolveWeeklyRent(noCoupleFee, { occupantCount: 2 })).toMatchObject({
      weeklyRent: 400,
      breakdownAud: { base: 400 },
    })
  })

  it('defaults max_occupants to 1 when null', () => {
    expect(() =>
      resolveWeeklyRent(
        { rent_per_week: 300, max_occupants: null },
        { occupantCount: 2 },
      ),
    ).toThrow(ResolveWeeklyRentError)
  })
})

describe('propertyHasVariableOccupancyPricing', () => {
  it('true when couple or paid parking offered', () => {
    expect(propertyHasVariableOccupancyPricing(casaRoom)).toBe(true)
    expect(
      propertyHasVariableOccupancyPricing({
        rent_per_week: 300,
        couple_surcharge_per_week: null,
        parking_surcharge_per_week: 50,
        parking_available: true,
      }),
    ).toBe(true)
    expect(
      propertyHasVariableOccupancyPricing({
        rent_per_week: 300,
        couple_surcharge_per_week: null,
        parking_surcharge_per_week: null,
        parking_available: false,
      }),
    ).toBe(false)
  })
})

describe('maxWeeklyRentForProperty', () => {
  it('returns highest tier for bond helper', () => {
    expect(maxWeeklyRentForProperty(casaRoom)).toBe(550)
    expect(
      maxWeeklyRentForProperty({
        rent_per_week: 400,
        max_occupants: 1,
        parking_available: false,
      }),
    ).toBe(400)
  })
})
