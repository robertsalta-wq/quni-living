/**
 * Pure derivation of "lease document state" for a booking - used by both the renter
 * and landlord booking detail surfaces (Phase 3 / Task J).
 *
 * The booking + tenancy_document combination produces one of these conceptual states
 * which the UI maps to the right CTA / view-only / download element:
 *
 *   - 'none'              - no tenancy document yet (lease not generated).
 *   - 'preview'           - Listing-tier draft: PDF exists, signing is intentionally deferred
 *                           until the landlord ticks "Bond received". Both parties may VIEW
 *                           the draft but cannot sign yet.
 *   - 'ready_to_sign'     - DocuSeal session is live and the viewer has not yet signed.
 *   - 'awaiting_other'    - DocuSeal session is live, viewer has signed but counterparty has not.
 *   - 'fully_signed'      - All required parties have signed; the executed PDF is downloadable.
 *
 * When the booking has a co-tenant (occupant_count >= 2 with co_tenant details), a third
 * DocuSeal signature is required before `fully_signed`.
 */

export type LeaseDocState =
  | 'none'
  | 'agreement_preparing'
  | 'agreement_failed'
  | 'preview'
  | 'ready_to_sign'
  | 'awaiting_other'
  | 'fully_signed'

export type LeaseStateInput = {
  bookingStatus: string | null | undefined
  serviceTierFinal: string | null | undefined
  /** Whether a tenancy_document row exists for this tenancy at all. */
  documentExists: boolean
  /** tenancy_documents.status - 'draft' | 'sent_for_signing' | 'signed' | etc. */
  documentStatus: string | null | undefined
  landlordSignedAt: string | null | undefined
  studentSignedAt: string | null | undefined
  /** When true, co_tenant_signed_at must be set for fully_signed. */
  coTenantSigningRequired?: boolean
  coTenantSignedAt?: string | null | undefined
  viewerRole: 'landlord' | 'tenant'
}

function timestampSet(v: string | null | undefined): boolean {
  return Boolean(v && String(v).trim())
}

function allRequiredPartiesSigned(input: LeaseStateInput): boolean {
  const landlordOk = timestampSet(input.landlordSignedAt)
  const studentOk = timestampSet(input.studentSignedAt)
  const coOk = !input.coTenantSigningRequired || timestampSet(input.coTenantSignedAt)
  return landlordOk && studentOk && coOk
}

/** Purely derive the conceptual lease state for the viewer. No I/O. */
export function deriveLeaseDocState(input: LeaseStateInput): LeaseDocState {
  if (allRequiredPartiesSigned(input)) return 'fully_signed'

  if (!input.documentExists) return 'none'

  const status = (input.documentStatus ?? '').trim()

  if (status === 'sent_for_signing') {
    const viewerSignedAt =
      input.viewerRole === 'landlord' ? input.landlordSignedAt : input.studentSignedAt
    if (timestampSet(viewerSignedAt)) {
      return 'awaiting_other'
    }
    return 'ready_to_sign'
  }

  if (status === 'draft') {
    return 'preview'
  }

  if (status === 'signed') {
    const viewerSignedAt =
      input.viewerRole === 'landlord' ? input.landlordSignedAt : input.studentSignedAt
    if (timestampSet(viewerSignedAt)) return 'awaiting_other'
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
    case 'agreement_preparing':
      return 'Agreement being prepared'
    case 'agreement_failed':
      return 'Agreement needs attention'
    case 'none':
    default:
      return ''
  }
}
