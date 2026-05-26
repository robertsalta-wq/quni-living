import { describe, expect, it } from 'vitest'
import {
  additionalTenantNamesFromBooking,
  coTenantSpecialConditionsLines,
  maxOccupantsPermittedForLease,
  parseCoTenantFromBooking,
} from './occupancyLeaseContext.js'

describe('occupancyLeaseContext', () => {
  it('parses co-tenant snapshot', () => {
    const ct = parseCoTenantFromBooking({
      full_name: 'Alex Partner',
      email: 'alex@example.com',
      phone: '0400000000',
      date_of_birth: '2000-01-15',
    })
    expect(ct?.full_name).toBe('Alex Partner')
  })

  it('uses property max_occupants for permitted count', () => {
    expect(
      maxOccupantsPermittedForLease({ occupant_count: 2, housemates_count: 1 }, { max_occupants: 2 }),
    ).toBe(2)
  })

  it('falls back to occupant_count when property max is missing', () => {
    expect(maxOccupantsPermittedForLease({ occupant_count: 2 }, null)).toBe(2)
  })

  it('builds additional tenant names from booking', () => {
    expect(
      additionalTenantNamesFromBooking({
        co_tenant: { full_name: 'Sam Lee', email: 'sam@example.com', phone: '0411111111', date_of_birth: '1999-05-01' },
      }),
    ).toEqual(['Sam Lee'])
  })

  it('emits special condition lines for co-tenant', () => {
    const lines = coTenantSpecialConditionsLines({
      full_name: 'Sam Lee',
      email: 'sam@example.com',
      phone: '0411111111',
      date_of_birth: '1999-05-01',
    })
    expect(lines[0]).toContain('Sam Lee')
    expect(lines.some((l) => l.includes('date of birth'))).toBe(true)
  })
})
