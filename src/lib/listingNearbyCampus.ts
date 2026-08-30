/**
 * Nearby-campus geocoding is only useful after the landlord has a complete
 * property address. Create listing must not start that work on open.
 */

export function listingAddressReadyForNearbyCampusLookup(
  address: string,
  suburb: string,
  state: string,
  postcode: string,
): boolean {
  return [address, suburb, state, postcode].every((part) => part.trim() !== '')
}

/**
 * Whether to start the nearby-campus lookup (and its blocking overlay).
 *
 * New listings: only after the user changes address fields this session.
 * A restored localStorage draft, leftover edit state, or default state=NSW
 * is not an address they just entered.
 *
 * Edit: also allow a one-shot bootstrap when the saved listing has a complete
 * address but no campus yet (`editBootstrapRequested`).
 */
export function shouldStartNearbyCampusLookup(opts: {
  isEdit: boolean
  userChangedAddressThisSession: boolean
  editBootstrapRequested: boolean
  addressReady: boolean
}): boolean {
  if (!opts.addressReady) return false
  if (opts.userChangedAddressThisSession) return true
  return opts.isEdit && opts.editBootstrapRequested
}
