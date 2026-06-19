const TOKEN_KEY = 'quni_tenant_invite_token'
const PROPERTY_KEY = 'quni_tenant_invite_property_id'

/** Persist invite context across signup → email confirm → onboarding → booking (mirrors accommodation route). */
export function setQuniTenantInviteContext(rawToken: string, propertyId: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, rawToken.trim())
    localStorage.setItem(PROPERTY_KEY, propertyId.trim())
  } catch {
    /* ignore */
  }
}

export function getQuniTenantInviteToken(): string | null {
  try {
    const v = localStorage.getItem(TOKEN_KEY)?.trim()
    return v || null
  } catch {
    return null
  }
}

export function getQuniTenantInvitePropertyId(): string | null {
  try {
    const v = localStorage.getItem(PROPERTY_KEY)?.trim()
    return v || null
  } catch {
    return null
  }
}

export function getQuniTenantInviteBookingRedirect(): string | null {
  const token = getQuniTenantInviteToken()
  const propertyId = getQuniTenantInvitePropertyId()
  if (!token || !propertyId) return null
  return `/booking/${propertyId}?invite=${encodeURIComponent(token)}`
}

export function clearQuniTenantInviteContext(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(PROPERTY_KEY)
  } catch {
    /* ignore */
  }
}
