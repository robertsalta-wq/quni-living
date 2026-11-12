/**
 * What a DocuSeal completion is allowed to do.
 * Only the primary tenancy agreement may be stored on a lease or signed-agreement
 * path, and only that agreement may run the lease charge.
 * A missing document_type stays on the primary lease path so older callers that
 * load lease rows without the column keep today's behaviour. Corrected addenda
 * are recognised from metadata first, so they never fall through to that path.
 */

export type SignedSubmissionKind =
  | 'residential_package'
  | 'primary_lease'
  | 'mutual_termination'
  | 'corrected_payee_addendum'
  | 'other'

export type CompletionEmailKind =
  | 'primary_agreement'
  | 'mutual_termination'
  | 'corrected_payee_addendum'
  | 'none'

export type CompletionDisposition = {
  kind: SignedSubmissionKind
  runsLeaseCharge: boolean
  email: CompletionEmailKind
}

const RESIDENTIAL_PACKAGES = new Set([
  'residential_tenancy',
  'residential_tenancy_qld',
  'residential_tenancy_vic',
])

export function metadataRecord(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {}
  return metadata as Record<string, unknown>
}

export function completionDisposition(doc: {
  document_type?: string | null
  metadata?: unknown
}): CompletionDisposition {
  const meta = metadataRecord(doc.metadata)
  const documentKind = typeof meta.document_kind === 'string' ? meta.document_kind : ''
  const surrenderKind = typeof meta.kind === 'string' ? meta.kind : ''
  const signingPackage = typeof meta.signing_package === 'string' ? meta.signing_package : ''
  const documentType = typeof doc.document_type === 'string' ? doc.document_type.trim() : ''

  if (documentKind === 'corrected_payee_addendum') {
    return { kind: 'corrected_payee_addendum', runsLeaseCharge: false, email: 'corrected_payee_addendum' }
  }
  if (documentType === 'mutual_termination' || surrenderKind === 'mutual_surrender') {
    return { kind: 'mutual_termination', runsLeaseCharge: false, email: 'mutual_termination' }
  }
  if (RESIDENTIAL_PACKAGES.has(signingPackage)) {
    return { kind: 'residential_package', runsLeaseCharge: true, email: 'primary_agreement' }
  }
  if (
    documentType === 'lease' ||
    documentType === 'residential_tenancy' ||
    signingPackage === 'rooming_accommodation_qld' ||
    documentType === ''
  ) {
    return { kind: 'primary_lease', runsLeaseCharge: true, email: 'primary_agreement' }
  }
  return { kind: 'other', runsLeaseCharge: false, email: 'none' }
}

export function primaryLeaseSignedPath(tenancyId: string): string {
  return `${tenancyId}/lease/lease_signed.pdf`
}

export function platformAddendumSignedPath(tenancyId: string): string {
  return `${tenancyId}/residential_tenancy/quni_platform_addendum_signed.pdf`
}

export function combinedResidentialPackageSignedPath(tenancyId: string): string {
  return `${tenancyId}/residential_tenancy/residential_tenancy_agreement_and_addendum_signed.pdf`
}

export function residentialAgreementSignedPath(
  tenancyId: string,
  signingPackage: string | null | undefined,
): string {
  if (signingPackage === 'residential_tenancy_vic') {
    return `${tenancyId}/residential_tenancy/vic_residential_rental_agreement_signed.pdf`
  }
  if (signingPackage === 'residential_tenancy_qld') {
    return `${tenancyId}/residential_tenancy/qld_form18a_general_tenancy_agreement_signed.pdf`
  }
  return `${tenancyId}/residential_tenancy/nsw_residential_tenancy_agreement_signed.pdf`
}

export function mutualTerminationSignedPath(tenancyId: string): string {
  return `${tenancyId}/mutual_termination/mutual_termination_signed.pdf`
}

function safeId(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9_-]/g, '')
  return cleaned || 'submission'
}

export function correctedPayeeAddendumSignedPath(tenancyId: string, submissionId: string): string {
  return `${tenancyId}/corrected_payee_addendum/${safeId(submissionId)}_signed.pdf`
}

export function nonLeaseSignedPath(
  tenancyId: string,
  documentType: string | null | undefined,
  submissionId: string,
): string {
  const type = (documentType || 'other').replace(/[^a-z0-9_]/gi, '') || 'other'
  return `${tenancyId}/${type}/${safeId(submissionId)}_signed.pdf`
}

/** Lease file and every signed residential-agreement file, including the platform addendum. */
export function isLeaseOrSignedAgreementPath(path: string): boolean {
  return path.includes('/lease/') || path.includes('/residential_tenancy/')
}

export function assertNonLeaseStoragePath(path: string): void {
  if (isLeaseOrSignedAgreementPath(path)) {
    throw new Error(`Refusing to store a non-lease submission at ${path}`)
  }
}
