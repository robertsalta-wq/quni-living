// @ts-nocheck
/**
 * Server-side mirror of `src/lib/leaseState.ts` (pure derivation; no I/O).
 *
 * Kept duplicated so the Vercel API bundle (`api/*`) does not import from `src/` at
 * runtime - the project convention is types-only from `src/`. Tests in
 * `src/lib/leaseState.test.ts` lock the contract; this file stays in lockstep.
 */

function timestampSet(v) {
  return Boolean(v && String(v).trim())
}

function allRequiredPartiesSigned(input) {
  const landlordOk = timestampSet(input.landlordSignedAt)
  const studentOk = timestampSet(input.studentSignedAt)
  const coOk = !input.coTenantSigningRequired || timestampSet(input.coTenantSignedAt)
  return landlordOk && studentOk && coOk
}

export function deriveLeaseDocState(input) {
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

  if (status === 'draft') return 'preview'

  if (status === 'signed') {
    const viewerSignedAt =
      input.viewerRole === 'landlord' ? input.landlordSignedAt : input.studentSignedAt
    if (timestampSet(viewerSignedAt)) return 'awaiting_other'
    return 'ready_to_sign'
  }

  return 'none'
}
