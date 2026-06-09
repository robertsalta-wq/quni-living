/** Persisted on bookings.listing_agreement_status for Listing-tier accepts. */
export type ListingAgreementStatus = 'pending' | 'ready' | 'failed'

export type ListingDocGenSkipReason =
  | 'no_internal_secret'
  | 'booking_not_found'
  | 'no_property'
  | 'tenancy_unsupported'
  | 'no_generator'

/** Result of listing tenancy document work — callers must branch on `ok`. */
export type ListingDocGenResult =
  | { ok: true; skipped?: false; tenancyId: string; documentId: string; docusealSubmissionId?: string | null }
  | { ok: true; skipped: true; reason: ListingDocGenSkipReason }
  | { ok: false; status: number; error: string; detail?: string }

export type ListingPreflightResult =
  | { ok: true; generator: string }
  | { ok: false; status: number; error: string; detail?: string }

export function assertListingDocGenOk(result: ListingDocGenResult): asserts result is Extract<
  ListingDocGenResult,
  { ok: true }
> {
  if (!result.ok) {
    throw new Error(result.error)
  }
}
