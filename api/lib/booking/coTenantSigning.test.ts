import { describe, expect, it } from 'vitest'

import {
  bookingRequiresCoTenantSignature,
  coTenantEmailDistinctFromPrimary,
} from './coTenantSigning.js'

describe('coTenantEmailDistinctFromPrimary', () => {
  it('returns true when emails differ', () => {
    expect(coTenantEmailDistinctFromPrimary('a@example.com', 'b@example.com')).toBe(true)
  })

  it('returns false when emails match case-insensitively', () => {
    expect(coTenantEmailDistinctFromPrimary('A@Example.com', 'a@example.com')).toBe(false)
  })

  it('returns true when either email is empty', () => {
    expect(coTenantEmailDistinctFromPrimary('', 'b@example.com')).toBe(true)
    expect(coTenantEmailDistinctFromPrimary('a@example.com', '')).toBe(true)
  })
})

describe('bookingRequiresCoTenantSignature', () => {
  it('is false for single occupant', () => {
    expect(bookingRequiresCoTenantSignature({ occupant_count: 1, co_tenant: null })).toBe(false)
  })

  it('is false for two occupants without co_tenant payload', () => {
    expect(bookingRequiresCoTenantSignature({ occupant_count: 2, co_tenant: null })).toBe(false)
  })

  it('is true for two occupants with co_tenant details', () => {
    expect(
      bookingRequiresCoTenantSignature({
        occupant_count: 2,
        co_tenant: {
          full_name: 'Sam Co',
          email: 'sam@example.com',
          phone: '0400000000',
          date_of_birth: '2000-01-01',
        },
      }),
    ).toBe(true)
  })
})
