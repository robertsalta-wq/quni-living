import { describe, expect, it } from 'vitest'

import {
  assertPiMetadataMatchesOccupancy,
  housematesCountFromOccupantCount,
  occupancyFromPaymentIntentMetadata,
  parseCoTenantFromBody,
  parseOccupancyScalarsFromBody,
  resolveCoTenantForCommit,
  resolveWeeklyRentForBooking,
} from './occupancyBooking.js'

const property = {
  rent_per_week: 400,
  max_occupants: 2,
  couple_surcharge_per_week: 100,
  parking_surcharge_per_week: 50,
  parking_available: true,
}

describe('parseOccupancyScalarsFromBody', () => {
  it('defaults to sole occupant', () => {
    expect(parseOccupancyScalarsFromBody({})).toEqual({
      ok: true,
      occupantCount: 1,
      parkingSelected: false,
    })
  })

  it('accepts couple + parking flags', () => {
    expect(
      parseOccupancyScalarsFromBody({ occupantCount: 2, parkingSelected: true }),
    ).toEqual({
      ok: true,
      occupantCount: 2,
      parkingSelected: true,
    })
  })
})

describe('resolveCoTenantForCommit', () => {
  const validCo = {
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+61400000000',
    date_of_birth: '2000-01-15',
  }

  it('requires coTenant when two occupants', () => {
    expect(resolveCoTenantForCommit(2, null).ok).toBe(false)
    expect(resolveCoTenantForCommit(2, validCo)).toEqual({ ok: true, coTenant: validCo })
  })

  it('rejects coTenant for sole occupant', () => {
    expect(resolveCoTenantForCommit(1, validCo).ok).toBe(false)
    expect(resolveCoTenantForCommit(1, null)).toEqual({ ok: true, coTenant: null })
  })
})

describe('parseCoTenantFromBody', () => {
  it('rejects invalid email', () => {
    const r = parseCoTenantFromBody({
      full_name: 'Jane',
      email: 'not-an-email',
      phone: '0400000000',
      date_of_birth: '2000-01-01',
    })
    expect(r.ok).toBe(false)
  })
})

describe('resolveWeeklyRentForBooking', () => {
  it('resolves couple + parking total', () => {
    const r = resolveWeeklyRentForBooking(property, { occupantCount: 2, parkingSelected: true })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.resolved.weeklyRent).toBe(550)
      expect(r.resolved.weeklyRentCents).toBe(55_000)
    }
  })
})

describe('assertPiMetadataMatchesOccupancy', () => {
  it('passes when metadata matches commit body', () => {
    expect(
      assertPiMetadataMatchesOccupancy(
        {
          occupantCount: '2',
          parkingSelected: 'true',
          weeklyRentCents: '55000',
          depositCents: '55000',
        },
        {
          occupantCount: 2,
          parkingSelected: true,
          weeklyRentCents: 55_000,
          depositCents: 55_000,
        },
      ).ok,
    ).toBe(true)
  })

  it('fails when occupant count differs', () => {
    expect(
      assertPiMetadataMatchesOccupancy(
        { occupantCount: '1', parkingSelected: 'false', weeklyRentCents: '40000', depositCents: '40000' },
        {
          occupantCount: 2,
          parkingSelected: false,
          weeklyRentCents: 50_000,
          depositCents: 50_000,
        },
      ).ok,
    ).toBe(false)
  })
})

describe('housematesCountFromOccupantCount', () => {
  it('maps two occupants to one housemate', () => {
    expect(housematesCountFromOccupantCount(2)).toBe(1)
    expect(housematesCountFromOccupantCount(1)).toBe(0)
  })
})

describe('occupancyFromPaymentIntentMetadata', () => {
  it('defaults legacy PI without occupancy keys', () => {
    expect(occupancyFromPaymentIntentMetadata({ depositCents: '40000' })).toMatchObject({
      occupantCount: 1,
      parkingSelected: false,
      depositCents: 40_000,
    })
  })
})
