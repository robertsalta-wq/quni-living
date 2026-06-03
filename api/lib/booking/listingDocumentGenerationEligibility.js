/**
 * When Listing-tier document generators may run.
 * Listing accept sets `bond_pending` then generates with `defer_signing: false` — must be allowed.
 */
export function bookingAllowsTenancyDocumentGeneration(booking) {
  const status = typeof booking.status === 'string' ? booking.status : ''
  const tier = typeof booking.service_tier_final === 'string' ? booking.service_tier_final : ''
  if (status === 'confirmed' || status === 'active') return true
  return tier === 'listing' && status === 'bond_pending'
}

/** Draft-only path: defer DocuSeal until mark-bond-received (legacy / explicit defer). */
export function isListingPreviewGeneration(deferSigning, booking) {
  return (
    deferSigning === true &&
    booking.service_tier_final === 'listing' &&
    booking.status === 'bond_pending'
  )
}
