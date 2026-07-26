/** Persisted on bookings.listing_agreement_status for Listing-tier accepts. */
export type ListingAgreementStatus = 'pending' | 'ready' | 'failed' | 'voided'

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

/** HTTP mapping for listing doc-gen API routes (shared so Vercel TS narrowing stays consistent). */
export function mapListingDocGenHttpResult(
  result: ListingDocGenResult,
  deferSigning: boolean,
): { status: number; body: Record<string, unknown> } {
  if (result.ok === false) {
    return {
      status: result.status,
      body: {
        error: result.error,
        ...(result.detail ? { detail: result.detail, message: result.detail } : {}),
      },
    }
  }
  if (result.skipped === true) {
    return {
      status: 200,
      body: { ok: true, skipped: true, reason: result.reason },
    }
  }
  return {
    status: 200,
    body: {
      ok: true,
      tenancy_id: result.tenancyId,
      document_id: result.documentId,
      deferred_signing: deferSigning,
      ...(result.docusealSubmissionId
        ? { docuseal_submission_id: result.docusealSubmissionId }
        : {}),
    },
  }
}
