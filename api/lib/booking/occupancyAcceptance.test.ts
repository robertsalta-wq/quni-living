/**
 * Acceptance tests mapped to docs/occupancy-pricing-co-tenant-plan.md §11 (chunk 7).
 */
import { describe, expect, it } from 'vitest'
import {
  additionalTenantNamesFromBooking,
  maxOccupantsPermittedForLease,
  MissingBookingOccupantCountError,
  occupancyLeaseFieldsFromBooking,
} from './occupancyLeaseContext.js'
import {
  assertPiMetadataMatchesOccupancy,
  housematesCountFromOccupantCount,
  resolveCoTenantForCommit,
  resolveWeeklyRentForBooking,
} from './occupancyBooking.js'
import { resolveWeeklyRent } from '../pricing/resolveWeeklyRent.js'

const casaRoom = {
  rent_per_week: 400,
  max_occupants: 2,
  couple_surcharge_per_week: 100,
  parking_surcharge_per_week: 50,
  parking_available: true,
}

const validCo = {
  full_name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '+61400000000',
  date_of_birth: '2000-01-15',
}

describe('§11 Pricing acceptance', () => {
  it('no surcharges - base rent and 1-week deposit cents', () => {
    const legacy = {
      rent_per_week: 400,
      max_occupants: 1,
      couple_surcharge_per_week: null,
      parking_surcharge_per_week: null,
      parking_available: false,
    }
    const r = resolveWeeklyRent(legacy, { occupantCount: 1 })
    expect(r.weeklyRent).toBe(400)
    expect(r.weeklyRentCents).toBe(40_000)
  })

  it('couple surcharge - $500/wk', () => {
    const r = resolveWeeklyRentForBooking(casaRoom, { occupantCount: 2, parkingSelected: false })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.resolved.weeklyRent).toBe(500)
  })

  it('parking only when selected and available', () => {
    expect(
      resolveWeeklyRentForBooking(casaRoom, { occupantCount: 1, parkingSelected: true }).ok,
    ).toBe(true)
    expect(
      resolveWeeklyRentForBooking(
        { ...casaRoom, parking_available: false },
        { occupantCount: 1, parkingSelected: true },
      ).ok,
    ).toBe(false)
  })

  it('couple + parking - $550/wk', () => {
    const r = resolveWeeklyRentForBooking(casaRoom, { occupantCount: 2, parkingSelected: true })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.resolved.weeklyRent).toBe(550)
  })

  it('rejects occupantCount 2 when max_occupants = 1', () => {
    expect(
      resolveWeeklyRentForBooking({ ...casaRoom, max_occupants: 1 }, { occupantCount: 2 }).ok,
    ).toBe(false)
  })

  it('rejects parking when not offered', () => {
    expect(
      resolveWeeklyRentForBooking(
        { ...casaRoom, parking_available: false },
        { occupantCount: 1, parkingSelected: true },
      ).ok,
    ).toBe(false)
  })

  it('PI metadata mismatch blocks tampered deposit (wrong weekly cents)', () => {
    expect(
      assertPiMetadataMatchesOccupancy(
        {
          occupantCount: '2',
          parkingSelected: 'true',
          weeklyRentCents: '40000',
          depositCents: '40000',
        },
        {
          occupantCount: 2,
          parkingSelected: true,
          weeklyRentCents: 55_000,
          depositCents: 55_000,
        },
      ).ok,
    ).toBe(false)
  })
})

describe('§11 Co-tenant acceptance', () => {
  it('sole occupant - co-tenant not required', () => {
    expect(resolveCoTenantForCommit(1, null)).toEqual({ ok: true, coTenant: null })
  })

  it('two occupants - commit blocked without co-tenant', () => {
    expect(resolveCoTenantForCommit(2, null).ok).toBe(false)
    expect(resolveCoTenantForCommit(2, validCo).ok).toBe(true)
  })

  it('lease PDF fields - second tenant name from booking', () => {
    const booking = { co_tenant: validCo, occupant_count: 2 }
    expect(additionalTenantNamesFromBooking(booking)).toEqual(['Jane Smith'])
    const lease = occupancyLeaseFieldsFromBooking(booking, { max_occupants: 2 })
    expect(lease.additionalTenantNames).toEqual(['Jane Smith'])
    expect(lease.maxOccupantsPermitted).toBe(2)
  })

  it('housemates_count = 1 when two occupants', () => {
    expect(housematesCountFromOccupantCount(2)).toBe(1)
    expect(housematesCountFromOccupantCount(1)).toBe(0)
  })

  it('maxOccupantsPermitted comes from booking occupant_count only', () => {
    expect(maxOccupantsPermittedForLease({ occupant_count: 2 })).toBe(2)
  })

  it('throws when occupant_count missing for lease cap', () => {
    expect(() => occupancyLeaseFieldsFromBooking({}, { max_occupants: 2 })).toThrow(
      MissingBookingOccupantCountError,
    )
  })
})

describe('§11 Regression acceptance', () => {
  it('legacy listing - null surcharges book at base rent only', () => {
    const r = resolveWeeklyRentForBooking(
      {
        rent_per_week: 350,
        max_occupants: null,
        couple_surcharge_per_week: null,
        parking_surcharge_per_week: null,
        parking_available: false,
      },
      { occupantCount: 1, parkingSelected: false },
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.resolved.weeklyRent).toBe(350)
  })
})
