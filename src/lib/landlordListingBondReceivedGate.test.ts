import { describe, expect, it } from 'vitest'

import { landlordListingBondReceivedPrimaryVisible } from './landlordListingBondReceivedGate'

const ll = 'landlord-profile-uuid'

describe('landlordListingBondReceivedPrimaryVisible', () => {
  it('shows only when bond_pending + listing + viewer owns booking', () => {
    expect(
      landlordListingBondReceivedPrimaryVisible({
        bookingStatus: 'bond_pending',
        serviceTierFinal: 'listing',
        bookingLandlordId: ll,
        viewerLandlordProfileId: ll,
      }),
    ).toBe(true)
  })

  it('hidden when wrong status', () => {
    expect(
      landlordListingBondReceivedPrimaryVisible({
        bookingStatus: 'pending_confirmation',
        serviceTierFinal: 'listing',
        bookingLandlordId: ll,
        viewerLandlordProfileId: ll,
      }),
    ).toBe(false)
  })

  it('hidden when tier is not listing', () => {
    expect(
      landlordListingBondReceivedPrimaryVisible({
        bookingStatus: 'bond_pending',
        serviceTierFinal: 'managed',
        bookingLandlordId: ll,
        viewerLandlordProfileId: ll,
      }),
    ).toBe(false)
  })

  it('hidden when viewer is not the booking landlord', () => {
    expect(
      landlordListingBondReceivedPrimaryVisible({
        bookingStatus: 'bond_pending',
        serviceTierFinal: 'listing',
        bookingLandlordId: ll,
        viewerLandlordProfileId: 'other',
      }),
    ).toBe(false)
  })
})
