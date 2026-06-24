const KEY = 'quni_signup_terms_accepted_at'

/** Stash terms acceptance from /signup until the profile row is created or updated. */
export function stashSignupTermsAcceptedAt(iso: string): void {
  try {
    localStorage.setItem(KEY, iso)
  } catch {
    /* ignore */
  }
}

export function peekSignupTermsAcceptedAt(): string | null {
  try {
    const v = localStorage.getItem(KEY)?.trim()
    return v || null
  } catch {
    return null
  }
}

export function consumeSignupTermsAcceptedAt(): string | null {
  const v = peekSignupTermsAcceptedAt()
  if (!v) return null
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  return v
}

export function renterSignupTermsPatch(acceptedAt: string): { terms_accepted_at: string } {
  return { terms_accepted_at: acceptedAt }
}

export function landlordSignupTermsPatch(acceptedAt: string): {
  terms_accepted_at: string
  landlord_terms_accepted_at: string
} {
  return {
    terms_accepted_at: acceptedAt,
    landlord_terms_accepted_at: acceptedAt,
  }
}
