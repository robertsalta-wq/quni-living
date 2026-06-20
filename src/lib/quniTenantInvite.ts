const TOKEN_KEY = 'quni_tenant_invite_token'
const PROPERTY_KEY = 'quni_tenant_invite_property_id'
const TITLE_KEY = 'quni_tenant_invite_property_title'
const STUDENT_ONLY_KEY = 'quni_tenant_invite_student_only'
const INVITED_NAME_KEY = 'quni_tenant_invite_invited_name'
const OFFERED_RENT_KEY = 'quni_tenant_invite_offered_rent'
const OFFER_REASON_KEY = 'quni_tenant_invite_offer_reason'
const SET_AT_KEY = 'quni_tenant_invite_set_at'

/** Match tenant_invites default expiry — persisted context older than this is abandoned. */
const INVITE_CONTEXT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

function readInviteSetAtMs(): number | null {
  try {
    const v = localStorage.getItem(SET_AT_KEY)
    const n = v ? Number(v) : NaN
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

/** Persisted invite from /invite/:token — still within the invite TTL window. */
export function hasRecentQuniTenantInviteContext(): boolean {
  const token = getQuniTenantInviteToken()
  const propertyId = getQuniTenantInvitePropertyId()
  if (!token || !propertyId) return false
  const setAt = readInviteSetAtMs()
  if (!setAt) return true
  return Date.now() - setAt <= INVITE_CONTEXT_MAX_AGE_MS
}

/** Drop expired persisted invite (e.g. user returns weeks later). */
export function clearStaleQuniTenantInviteContext(): void {
  if (!getQuniTenantInviteToken()) return
  if (hasRecentQuniTenantInviteContext()) return
  clearQuniTenantInviteContext()
}

function bookingPathPropertyId(path: string): string | null {
  const m = path.match(/^\/booking\/([^/?]+)/)
  const id = m?.[1]?.trim()
  return id || null
}

/** Keep invite token on booking links when the prospect browsed listing details mid-flow. */
export function appendTenantInviteToBookingPath(bookingPath: string): string {
  if (!hasRecentQuniTenantInviteContext() || bookingPath.includes('invite=')) return bookingPath
  const token = getQuniTenantInviteToken()
  const propertyId = getQuniTenantInvitePropertyId()
  if (!token || !propertyId) return bookingPath
  if (bookingPathPropertyId(bookingPath) !== propertyId) return bookingPath
  const sep = bookingPath.includes('?') ? '&' : '?'
  return `${bookingPath}${sep}invite=${encodeURIComponent(token)}`
}

/** Same booking path without stripping a stored invite redirect (listing detail → signup). */
export function shouldKeepStoredInviteRedirect(existing: string, incoming: string): boolean {
  if (!existing.includes('invite=')) return false
  if (incoming.includes('invite=')) return false
  const base = (p: string) => p.split('?')[0] ?? p
  return base(existing) === base(incoming)
}

export type QuniTenantInviteDisplayContext = {
  propertyId: string
  propertyTitle: string | null
  studentOnly: boolean
  invitedName: string | null
  offeredWeeklyRentAud: number | null
  offerReason: string | null
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
    localStorage.setItem(SET_AT_KEY, String(Date.now()))
    if (display?.propertyTitle) localStorage.setItem(TITLE_KEY, display.propertyTitle.trim())
    if (display?.studentOnly) localStorage.setItem(STUDENT_ONLY_KEY, '1')
    else localStorage.removeItem(STUDENT_ONLY_KEY)
    if (display?.invitedName) localStorage.setItem(INVITED_NAME_KEY, display.invitedName.trim())
    else localStorage.removeItem(INVITED_NAME_KEY)
    if (display?.offeredWeeklyRentAud != null && Number.isFinite(Number(display.offeredWeeklyRentAud))) {
      localStorage.setItem(OFFERED_RENT_KEY, String(display.offeredWeeklyRentAud))
    } else {
      localStorage.removeItem(OFFERED_RENT_KEY)
    }
    if (display?.offerReason) localStorage.setItem(OFFER_REASON_KEY, display.offerReason.trim())
    else localStorage.removeItem(OFFER_REASON_KEY)
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
      offeredWeeklyRentAud: (() => {
        const raw = localStorage.getItem(OFFERED_RENT_KEY)
        const n = raw != null ? Number(raw) : NaN
        return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null
      })(),
      offerReason: localStorage.getItem(OFFER_REASON_KEY)?.trim() || null,
    }
  } catch {
    return {
      propertyId,
      propertyTitle: null,
      studentOnly: false,
      invitedName: null,
      offeredWeeklyRentAud: null,
      offerReason: null,
    }
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
  if (!hasRecentQuniTenantInviteContext()) return null
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
    localStorage.removeItem(OFFERED_RENT_KEY)
    localStorage.removeItem(OFFER_REASON_KEY)
    localStorage.removeItem(SET_AT_KEY)
  } catch {
    /* ignore */
  }
}
