/**
 * When the landlord Bookings Actions column may offer Open/Download agreement.
 * Fully signed PDFs are offered for any booking status; open-for-signing only while
 * the agreement flow is active (bond pending / confirmed / active).
 */
export function shouldOfferLandlordAgreementListAction(args: {
  hasSignedPaths: boolean
  status: string
}): boolean {
  if (args.hasSignedPaths) return true
  return args.status === 'bond_pending' || args.status === 'confirmed' || args.status === 'active'
}

/** Mutual termination download when the signed PDF is in Storage. */
export function shouldOfferLandlordTerminationListAction(hasSignedPath: boolean): boolean {
  return hasSignedPath
}

/** Renter / landlord review: show the lease panel for post-accept statuses that may still need download. */
export function bookingStatusShowsLeaseAgreementSurface(status: string): boolean {
  return (
    status === 'bond_pending' ||
    status === 'confirmed' ||
    status === 'active' ||
    status === 'completed' ||
    status === 'terminating' ||
    status === 'terminated'
  )
}
