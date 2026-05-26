import { describe, expect, it } from 'vitest'
import { buildBookingFitSummary } from './bookingFitSummary'

const baseStudent = {
  occupancy_type: 'couple' as const,
  move_in_flexibility: null,
  has_pets: null,
  needs_parking: null,
  bills_preference: null,
  furnishing_preference: null,
}

const baseBooking = {
  move_in_date: '2026-06-01',
  start_date: null,
  lease_length: '6 months',
  occupant_count: 2,
  parking_selected: false,
}

describe('buildBookingFitSummary occupancy', () => {
  it('matches couple on single room when max_occupants >= 2', () => {
    const rows = buildBookingFitSummary({
      booking: baseBooking,
      student: baseStudent,
      property: {
        room_type: 'single',
        listing_type: 'rent',
        max_occupants: 2,
        available_from: '2026-05-01',
        lease_length: '6 months',
        furnished: true,
        parking_available: false,
      } as never,
    })
    const occ = rows.find((r) => r.label === 'Occupancy')
    expect(occ?.status).toBe('match')
    expect(occ?.studentSide).toContain('2 occupants')
  })

  it('mismatches 2 occupants when max_occupants is 1', () => {
    const rows = buildBookingFitSummary({
      booking: baseBooking,
      student: baseStudent,
      property: {
        room_type: 'single',
        listing_type: 'rent',
        max_occupants: 1,
        available_from: '2026-05-01',
        lease_length: '6 months',
        furnished: true,
      } as never,
    })
    expect(rows.find((r) => r.label === 'Occupancy')?.status).toBe('mismatch')
  })

  it('uses parking_selected at booking for parking row', () => {
    const rows = buildBookingFitSummary({
      booking: { ...baseBooking, parking_selected: true },
      student: { ...baseStudent, needs_parking: false },
      property: {
        room_type: 'single',
        max_occupants: 2,
        parking_available: true,
        available_from: null,
        lease_length: null,
        furnished: null,
      } as never,
    })
    const park = rows.find((r) => r.label === 'Parking')
    expect(park?.status).toBe('match')
    expect(park?.studentSide).toContain('Carpark selected')
  })
})
