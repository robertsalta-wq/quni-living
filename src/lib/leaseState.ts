/**
 * Pure derivation of "lease document state" for a booking — used by both the renter
 * and landlord booking detail surfaces (Phase 3 / Task J).
 *
 * The booking + tenancy_document combination produces one of these conceptual states
 * which the UI maps to the right CTA / view-only / download element:
 *
 *   - 'none'              — no tenancy document yet (lease not generated).
 *   - 'preview'           — Listing-tier draft: PDF exists, signing is intentionally deferred
 *                           until the landlord ticks "Bond received". Both parties may VIEW
 *                           the draft but cannot sign yet.
 *   - 'ready_to_sign'     — DocuSeal session is live and the viewer has not yet signed.
 *   - 'awaiting_other'    — DocuSeal session is live, viewer has signed but counterparty has not.
 *   - 'fully_signed'      — Both parties have signed; the executed PDF is downloadable.
 *
 * Decision: the "Download signed agreement" button is gated on `fully_signed` (both
 * landlord_signed_at AND student_signed_at populated), not just on `tenancy_documents.status`.
 * This fixes the backlog item where the button could appear after a single party signed.
 */

export type LeaseDocState = 'none' | 'preview' | 'ready_to_sign' | 'awaiting_other' | 'fully_signed'

export type LeaseStateInput = {
  bookingStatus: string | null | undefined
  serviceTierFinal: string | null | undefined
  /** Whether a tenancy_document row exists for this tenancy at all. */
  documentExists: boolean
  /** tenancy_documents.status — 'draft' | 'sent_for_signing' | 'signed' | etc. */
  documentStatus: string | null | undefined
  landlordSignedAt: string | null | undefined
  studentSignedAt: string | null | undefined
  viewerRole: 'landlord' | 'tenant'
}

/** Purely derive the conceptual lease state for the viewer. No I/O. */
export function deriveLeaseDocState(input: LeaseStateInput): LeaseDocState {
  const fullySigned = Boolean(
    input.landlordSignedAt && String(input.landlordSignedAt).trim() &&
      input.studentSignedAt && String(input.studentSignedAt).trim(),
  )
  if (fullySigned) return 'fully_signed'

  if (!input.documentExists) return 'none'

  const status = (input.documentStatus ?? '').trim()

  if (status === 'sent_for_signing') {
    const viewerSignedAt =
      input.viewerRole === 'landlord' ? input.landlordSignedAt : input.studentSignedAt
    if (viewerSignedAt && String(viewerSignedAt).trim()) {
      return 'awaiting_other'
    }
    return 'ready_to_sign'
  }

  if (status === 'draft') {
    /**
     * Preview-only mode is only meaningful while the booking is still gating signing.
     * For Listing this is `bond_pending`; once the booking moves to confirmed/active we
     * still show "preview" (rather than "none") so the viewer sees something between the
     * server creating the row and DocuSeal accepting the submission. Real "ready_to_sign"
     * arrives when status flips to sent_for_signing.
     */
    return 'preview'
  }

  if (status === 'signed') {
    /** Status flag is on but timestamps are not — treat as awaiting completion. */
    const viewerSignedAt =
      input.viewerRole === 'landlord' ? input.landlordSignedAt : input.studentSignedAt
    if (viewerSignedAt && String(viewerSignedAt).trim()) return 'awaiting_other'
    return 'ready_to_sign'
  }

  return 'none'
}

/** Human label for the conceptual state (used in CTAs / banners). */
export function leaseDocStateCtaLabel(state: LeaseDocState): string {
  switch (state) {
    case 'preview':
      return 'View lease preview (draft)'
    case 'ready_to_sign':
      return 'Sign your tenancy agreement'
    case 'awaiting_other':
      return 'Awaiting counterparty signature'
    case 'fully_signed':
      return 'Download signed agreement'
    case 'none':
    default:
      return ''
  }
}
