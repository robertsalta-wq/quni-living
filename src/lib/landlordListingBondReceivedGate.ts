/**
 * Whether the Listing “bond received from renter” primary action should show on landlord booking review.
 * Caller must enforce route auth; this mirrors visible conditions for tests and the page.
 */
export function landlordListingBondReceivedPrimaryVisible(args: {
  bookingStatus: string
  serviceTierFinal: string | null | undefined
  bookingLandlordId: string | null | undefined
  viewerLandlordProfileId: string | null | undefined
}): boolean {
  return (
    args.bookingStatus === 'bond_pending' &&
    args.serviceTierFinal === 'listing' &&
    Boolean(args.bookingLandlordId) &&
    args.bookingLandlordId === args.viewerLandlordProfileId
  )
}
