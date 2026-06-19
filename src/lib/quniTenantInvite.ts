const TOKEN_KEY = 'quni_tenant_invite_token'
const PROPERTY_KEY = 'quni_tenant_invite_property_id'
const TITLE_KEY = 'quni_tenant_invite_property_title'
const STUDENT_ONLY_KEY = 'quni_tenant_invite_student_only'
const INVITED_NAME_KEY = 'quni_tenant_invite_invited_name'

export type QuniTenantInviteDisplayContext = {
  propertyId: string
  propertyTitle: string | null
  studentOnly: boolean
  invitedName: string | null
}

/** Persist invite context across signup → email confirm → onboarding → booking (mirrors accommodation route). */
export function setQuniTenantInviteContext(
  rawToken: string,
  propertyId: string,
  display?: Partial<Omit<QuniTenantInviteDisplayContext, 'propertyId'>>,
): void {
  try {
    localStorage.setItem(TOKEN_KEY, rawToken.trim())
    localStorage.setItem(PROPERTY_KEY, propertyId.trim())
    if (display?.propertyTitle) localStorage.setItem(TITLE_KEY, display.propertyTitle.trim())
    if (display?.studentOnly) localStorage.setItem(STUDENT_ONLY_KEY, '1')
    else localStorage.removeItem(STUDENT_ONLY_KEY)
    if (display?.invitedName) localStorage.setItem(INVITED_NAME_KEY, display.invitedName.trim())
    else localStorage.removeItem(INVITED_NAME_KEY)
  } catch {
    /* ignore */
  }
}

export function getQuniTenantInviteDisplayContext(): QuniTenantInviteDisplayContext | null {
  const propertyId = getQuniTenantInvitePropertyId()
  if (!propertyId) return null
  try {
    return {
      propertyId,
      propertyTitle: localStorage.getItem(TITLE_KEY)?.trim() || null,
      studentOnly: localStorage.getItem(STUDENT_ONLY_KEY) === '1',
      invitedName: localStorage.getItem(INVITED_NAME_KEY)?.trim() || null,
    }
  } catch {
    return { propertyId, propertyTitle: null, studentOnly: false, invitedName: null }
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
    localStorage.removeItem(TITLE_KEY)
    localStorage.removeItem(STUDENT_ONLY_KEY)
    localStorage.removeItem(INVITED_NAME_KEY)
  } catch {
    /* ignore */
  }
}
