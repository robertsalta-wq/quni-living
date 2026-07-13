import { describe, expect, it } from 'vitest'
import { BOOKING_EVENT_TRIGGER_WATCHED_COLUMNS } from './setBookingEventActor.js'

describe('BOOKING_EVENT_TRIGGER_WATCHED_COLUMNS', () => {
  it('matches Stage 3 status spine watch list', () => {
    expect([...BOOKING_EVENT_TRIGGER_WATCHED_COLUMNS]).toEqual([
      'status',
      'listing_agreement_status',
      'bond_received_by_landlord_at',
      'booking_fee_paid',
      'expired_at',
      'declined_at',
    ])
  })
})
