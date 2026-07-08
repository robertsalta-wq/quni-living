export type NameProfile = {
  first_name?: string | null
  last_name?: string | null
  full_name?: string | null
  preferred_name?: string | null // students only; landlords won't have it
  company_name?: string | null // landlords only
  verification_type?: string | null // students: 'identity' when ID-verified
  legal_name_locked_at?: string | null
}

function trimOrEmpty(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function joinedFirstLast(p: NameProfile): string {
  const first = trimOrEmpty(p.first_name)
  const last = trimOrEmpty(p.last_name)
  return [first, last].filter(Boolean).join(' ')
}

/** Legal name for students — only when identity-verified and locked. No social fallbacks. */
export function studentLegalName(p: NameProfile): string | null {
  if (p.legal_name_locked_at == null) return null
  if (p.verification_type !== 'identity') return null
  const first = trimOrEmpty(p.first_name)
  const last = trimOrEmpty(p.last_name)
  if (!first || !last) return null
  return `${first} ${last}`
}

/**
 * Legal name for landlords — only when locked and individual first+last present.
 * Company lessor path is intentionally blocked until designed.
 */
export function landlordLegalName(p: NameProfile): string | null {
  if (p.legal_name_locked_at == null) return null
  // TODO(company-landlord): design verified company legal name capture.
  if (trimOrEmpty(p.company_name)) return null
  const first = trimOrEmpty(p.first_name)
  const last = trimOrEmpty(p.last_name)
  if (!first || !last) return null
  return `${first} ${last}`
}

/** Social/display name for students. Prefer preferred_name; never requires lock. */
export function studentDisplayName(p: NameProfile, fallback = 'Student'): string {
  const preferred = trimOrEmpty(p.preferred_name)
  if (preferred) return preferred
  const full = trimOrEmpty(p.full_name)
  if (full) return full
  const fromParts = joinedFirstLast(p)
  if (fromParts) return fromParts
  return fallback
}

/** Social/display name for landlords. Prefer full_name, then company, then parts. */
export function landlordDisplayName(p: NameProfile, fallback = 'Landlord'): string {
  const full = trimOrEmpty(p.full_name)
  if (full) return full
  const company = trimOrEmpty(p.company_name)
  if (company) return company
  const fromParts = joinedFirstLast(p)
  if (fromParts) return fromParts
  return fallback
}

export function studentLegalNameReady(p: NameProfile): boolean {
  return studentLegalName(p) !== null
}

export function landlordLegalNameReady(p: NameProfile): boolean {
  return landlordLegalName(p) !== null
}
