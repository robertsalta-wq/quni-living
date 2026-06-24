import { describe, expect, it } from 'vitest'
import {
  BOOKING_LANDLORD_RESPONSE_EXPIRY_DAYS_LISTING,
  BOOKING_LANDLORD_RESPONSE_EXPIRY_DAYS_MANAGED,
  landlordResponseExpiresAtIso,
  landlordResponseExpiryDays,
  landlordResponseExpiryLabel,
} from './landlordResponseExpiry'

describe('landlordResponseExpiry', () => {
  it('uses tier-specific day counts', () => {
    expect(landlordResponseExpiryDays('listing')).toBe(BOOKING_LANDLORD_RESPONSE_EXPIRY_DAYS_LISTING)
    expect(landlordResponseExpiryDays('managed')).toBe(BOOKING_LANDLORD_RESPONSE_EXPIRY_DAYS_MANAGED)
    expect(landlordResponseExpiryDays(null)).toBe(BOOKING_LANDLORD_RESPONSE_EXPIRY_DAYS_MANAGED)
  })

  it('formats labels for copy', () => {
    expect(landlordResponseExpiryLabel('listing')).toBe('7 days')
    expect(landlordResponseExpiryLabel('managed')).toBe('5 days')
  })

  it('computes expires_at from tier', () => {
    const from = Date.parse('2026-06-01T12:00:00.000Z')
    expect(landlordResponseExpiresAtIso('listing', from)).toBe('2026-06-08T12:00:00.000Z')
    expect(landlordResponseExpiresAtIso('managed', from)).toBe('2026-06-06T12:00:00.000Z')
  })
})
