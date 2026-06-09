import type { SupabaseClient } from '@supabase/supabase-js'
import type { ListingAgreementStatus } from './listingAgreementTypes.js'

const MAX_ERROR_LEN = 500

export async function setListingAgreementStatus(
  admin: SupabaseClient,
  bookingId: string,
  status: ListingAgreementStatus | null,
  error?: string | null,
): Promise<void> {
  const patch: { listing_agreement_status: ListingAgreementStatus | null; listing_agreement_error?: string | null } = {
    listing_agreement_status: status,
  }
  if (error !== undefined) {
    patch.listing_agreement_error =
      error && error.trim() ? error.trim().slice(0, MAX_ERROR_LEN) : null
  }
  const { error: upErr } = await admin.from('bookings').update(patch).eq('id', bookingId)
  if (upErr) {
    console.error('[listing-agreement-status] update', bookingId, upErr)
  }
}
