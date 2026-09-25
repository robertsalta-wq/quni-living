import { describe, expect, it } from 'vitest'
import {
  bookingOccupantCountForProfile,
  clampBookingOccupantCount,
  validateBookingOccupancy,
} from './BookingOccupancySection'

const emptyCoTenant = { fullName: '', email: '', phone: '', dateOfBirth: '' }

describe('bookingOccupantCountForProfile', () => {
  it('prefills 2 for a couple only when the listing allows two people', () => {
    expect(bookingOccupantCountForProfile('couple', 2)).toBe(2)
    expect(bookingOccupantCountForProfile('couple', 1)).toBe(1)
  })

  it('stays at 1 for sole or open occupancy', () => {
    expect(bookingOccupantCountForProfile('sole', 2)).toBe(1)
    expect(bookingOccupantCountForProfile('open', 2)).toBe(1)
    expect(bookingOccupantCountForProfile(null, 2)).toBe(1)
  })
})

describe('clampBookingOccupantCount', () => {
  it('drops a two-person selection on a one-occupant listing', () => {
    expect(clampBookingOccupantCount(2, 1)).toBe(1)
  })

  it('keeps two people when the listing allows it', () => {
    expect(clampBookingOccupantCount(2, 2)).toBe(2)
    expect(clampBookingOccupantCount(1, 2)).toBe(1)
  })
})

describe('validateBookingOccupancy', () => {
  it('blocks two occupants on a one-person listing', () => {
    expect(
      validateBookingOccupancy({
        maxOccupants: 1,
        occupantCount: 2,
        parkingSelected: false,
        parkingAvailable: false,
        coTenant: emptyCoTenant,
      }),
    ).toBe('This listing is for one occupant only.')
  })
})
