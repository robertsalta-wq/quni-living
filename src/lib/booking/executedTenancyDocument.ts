/**
 * Tenancy document rows usable for "download executed PDF" after full signing.
 * After mutual termination, rows are often flipped from `signed` → `archived`
 * while file_path and party timestamps remain.
 */
export function isExecutedTenancyDocumentStatus(status: string | null | undefined): boolean {
  const s = (status ?? '').trim()
  return s === 'signed' || s === 'archived'
}

/**
 * Prefer party timestamps for `archived` rows (avoids offering cancelled drafts).
 * `signed` alone is enough; partially-signed Webhooks are rare and gated elsewhere.
 */
export function isFullyExecutedTenancyDocument(args: {
  status: string | null | undefined
  landlordSignedAt?: string | null
  studentSignedAt?: string | null
  coTenantSigningRequired?: boolean
  coTenantSignedAt?: string | null
}): boolean {
  if (!isExecutedTenancyDocumentStatus(args.status)) return false
  const landlordOk = Boolean(args.landlordSignedAt && String(args.landlordSignedAt).trim())
  const studentOk = Boolean(args.studentSignedAt && String(args.studentSignedAt).trim())
  const coOk =
    !args.coTenantSigningRequired ||
    Boolean(args.coTenantSignedAt && String(args.coTenantSignedAt).trim())
  if ((args.status ?? '').trim() === 'archived') {
    return landlordOk && studentOk && coOk
  }
  // status === signed: allow path resolution; dashboard/API still check paths/dual files
  if (landlordOk || studentOk) {
    return landlordOk && studentOk && coOk
  }
  return true
}
