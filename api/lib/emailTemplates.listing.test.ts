import { describe, expect, it } from 'vitest'

import {
  listingBondPendingExpiredLandlord,
  listingBondPendingExpiredRenter,
  listingBondReceivedLandlord,
  listingBondReceivedRenter,
  listingBookingAcceptedLandlord,
  listingBookingAcceptedRenter,
  listingCancelledByLandlordLandlord,
  listingCancelledByLandlordRenter,
} from './emailTemplates.js'

const sample = {
  student_name: 'Alex Student',
  landlord_name: 'Jordan Host',
  property_address: '42 Example St, Sydney NSW 2000',
  property_title: 'Sunlit room near campus',
  booking_reference: 'A1B2C3D4',
  bond_deadline_display: '18 May 2026',
  lease_preview_url: 'https://example.test/student-dashboard',
  student_dashboard_url: 'https://example.test/student-dashboard',
  listing_fee_display: '$99.00',
  mark_bond_received_url: 'https://example.test/landlord/bookings/x/review',
  sign_agreement_url: 'https://example.test/student-dashboard',
  listings_url: 'https://example.test/listings',
  dashboard_url: 'https://example.test/landlord/dashboard',
  cancellation_reason: 'No longer available',
}

describe('Listing email templates', () => {
  it('renders acceptance templates', () => {
    const r = listingBookingAcceptedRenter(sample)
    const l = listingBookingAcceptedLandlord(sample)
    expect(r.subject.length).toBeGreaterThan(5)
    expect(r.html).toContain('bond payment')
    expect(l.html).toContain('Listing fee')
  })

  it('renders bond-received templates', () => {
    const r = listingBondReceivedRenter(sample)
    const l = listingBondReceivedLandlord(sample)
    expect(r.html).toContain('Sign')
    expect(l.html).toContain('Bond receipt')
  })

  it('renders expiry templates', () => {
    const r = listingBondPendingExpiredRenter(sample)
    const l = listingBondPendingExpiredLandlord(sample)
    expect(r.html).toContain('lapsed')
    expect(l.html).toContain('refunded')
  })

  it('renders cancellation templates', () => {
    const r = listingCancelledByLandlordRenter(sample)
    const l = listingCancelledByLandlordLandlord(sample)
    expect(r.html).toContain('cancelled')
    expect(l.html).toContain('refund')
  })
})
