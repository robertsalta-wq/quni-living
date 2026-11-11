export type AgreementSignaturePrompt = {
  kind: 'sign' | 'waiting' | 'none'
  title: string
  href: string | null
}

function signed(value: string | null | undefined): boolean {
  return Boolean(value && String(value).trim())
}

export function agreementSignaturePrompt(args: {
  viewer: 'landlord' | 'student'
  landlordSignedAt?: string | null
  studentSignedAt?: string | null
  signingUrl?: string | null
}): AgreementSignaturePrompt {
  const mine = args.viewer === 'landlord' ? signed(args.landlordSignedAt) : signed(args.studentSignedAt)
  const other = args.viewer === 'landlord' ? signed(args.studentSignedAt) : signed(args.landlordSignedAt)
  if (mine && other) return { kind: 'none', title: '', href: null }
  if (!mine) {
    const href = args.signingUrl?.trim() || null
    if (!href) return { kind: 'none', title: '', href: null }
    return { kind: 'sign', title: 'Agreement waiting for your signature', href }
  }
  return { kind: 'waiting', title: 'Waiting for the other party to sign', href: null }
}

export function pickSigningAgreementDoc<T extends {
  document_type?: string | null
  status?: string | null
  landlord_signed_at?: string | null
  student_signed_at?: string | null
}>(docs: T[]): T | undefined {
  const candidates = docs.filter(
    (doc) => doc.document_type === 'residential_tenancy' || doc.document_type === 'lease',
  )
  return (
    candidates.find((doc) => doc.status === 'sent_for_signing') ||
    candidates.find((doc) => doc.status === 'signed' || doc.landlord_signed_at || doc.student_signed_at) ||
    candidates[0]
  )
}

export function embedSrcForRole(metadata: unknown, role: 'landlord' | 'student'): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const response = (metadata as { docuseal_response?: { submitters?: Array<{ role?: string; embed_src?: string }> } })
    .docuseal_response
  const submitters = response?.submitters
  if (!Array.isArray(submitters)) return null
  const match = submitters.find((row) => {
    const roleStr = (row.role || '').toLowerCase()
    if (role === 'landlord') return roleStr.includes('landlord') || roleStr.includes('first party')
    return (
      (roleStr.includes('tenant') || roleStr.includes('second party') || roleStr.includes('renter')) &&
      !roleStr.includes('co-tenant') &&
      !roleStr.includes('co tenant')
    )
  })
  const url = match?.embed_src?.trim()
  return url || null
}
