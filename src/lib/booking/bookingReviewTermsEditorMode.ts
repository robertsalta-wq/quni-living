import { listingBookingTermsEditorEligible } from '../../components/landlord/LandlordBookingTermsEditor'
import { parseRentOverrideProvenance } from '../pricing/rentAgreedOverride'

export type BookingReviewTermsEditorMode = 'listing_terms' | 'agreed_rent_readonly' | 'none'

/**
 * Which terms editor (if any) the landlord review Terms rail may open.
 *
 * Listing pre-sign → full `LandlordBookingTermsEditor`.
 * Agreed-rent override API rejects managed (`managed_booking`); the rail must not
 * advertise an editable Managed path. Legacy agreed-rent UI is only for viewing an
 * already-applied listing override after the booking leaves the terms-editor window.
 */
export function resolveBookingReviewTermsEditorMode(args: {
  status: string
  serviceTierAtRequest: string | null | undefined
  serviceTierFinal: string | null | undefined
  rentBreakdown: unknown
  inputsDisabled?: boolean
}): BookingReviewTermsEditorMode {
  if (args.inputsDisabled) return 'none'

  const listingEligible = listingBookingTermsEditorEligible(
    args.status,
    args.serviceTierAtRequest,
    args.serviceTierFinal,
  )
  if (listingEligible) return 'listing_terms'

  const overrideApplied = parseRentOverrideProvenance(args.rentBreakdown).overrideApplied
  if (overrideApplied && args.serviceTierAtRequest !== 'managed') return 'agreed_rent_readonly'

  return 'none'
}
