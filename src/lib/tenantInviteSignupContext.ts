import {
  clearQuniTenantInviteContext,
  clearStaleQuniTenantInviteContext,
  getQuniTenantInviteDisplayContext,
  hasRecentQuniTenantInviteContext,
} from './quniTenantInvite'
import { clearPostAuthRedirect, isSafeInternalPath, peekPostAuthRedirect } from './postAuthRedirect'

export type TenantInviteSignupHints = {
  isTenantInviteFlow: boolean
  propertyTitle: string | null
  invitedName: string | null
  invitedEmail: string | null
  studentOnly: boolean
  offeredWeeklyRentAud: number | null
  offerReason: string | null
}

function redirectHasInviteToken(redirect: string | null): boolean {
  if (!redirect || !isSafeInternalPath(redirect)) return false
  return redirect.includes('invite=')
}

/** URL / session signals that the user is still in an invite-driven auth flow (not mere localStorage). */
export function hasTenantInviteAuthUrlSignals(searchParams: URLSearchParams): boolean {
  if (searchParams.get('role')?.trim() === 'landlord') return false
  if (searchParams.get('invited_email')?.trim()) return true
  if (searchParams.get('invited_name')?.trim()) return true
  if (searchParams.get('invite_property')?.trim()) return true
  if (searchParams.get('invite_student_only') === '1') return true
  if (redirectHasInviteToken(searchParams.get('redirect'))) return true
  if (redirectHasInviteToken(peekPostAuthRedirect())) return true
  return false
}

/**
 * @deprecated Prefer hasTenantInviteAuthUrlSignals — name kept for Login call sites.
 * True when signup/login URL or stored post-auth redirect still points at an invite.
 */
export function isActiveTenantInviteAuthUrl(searchParams: URLSearchParams): boolean {
  return hasTenantInviteAuthUrlSignals(searchParams)
}

/**
 * Drop persisted invite state when the user opens generic signup/login (not from an invite link),
 * or explicitly starts landlord signup (`?role=landlord`).
 * Invite URL/session redirects keep context through listing-detail detours; expired context is cleared.
 */
export function abandonStaleTenantInviteUnlessActive(searchParams: URLSearchParams): void {
  clearStaleQuniTenantInviteContext()
  if (hasTenantInviteAuthUrlSignals(searchParams)) return
  clearQuniTenantInviteContext()
  const stored = peekPostAuthRedirect()
  if (stored && redirectHasInviteToken(stored)) clearPostAuthRedirect()
}

/** Signup / login UI hints when the prospect arrived via a landlord tenant invite link. */
export function resolveTenantInviteSignupHints(searchParams: URLSearchParams): TenantInviteSignupHints {
  abandonStaleTenantInviteUnlessActive(searchParams)

  const invitedEmail = searchParams.get('invited_email')?.trim() || null
  const invitedName = searchParams.get('invited_name')?.trim() || null
  const redirect = searchParams.get('redirect')
  const fromRedirect = redirectHasInviteToken(redirect)
  const fromSessionRedirect = redirectHasInviteToken(peekPostAuthRedirect())
  const stored = getQuniTenantInviteDisplayContext()
  const hasPersistedInvite = hasRecentQuniTenantInviteContext()

  const isTenantInviteFlow = Boolean(
    invitedEmail ||
      invitedName ||
      searchParams.get('invite_property')?.trim() ||
      fromRedirect ||
      fromSessionRedirect ||
      hasPersistedInvite,
  )

  const propertyTitle =
    searchParams.get('invite_property')?.trim() || stored?.propertyTitle || null

  const studentOnly =
    searchParams.get('invite_student_only') === '1' || stored?.studentOnly === true

  return {
    isTenantInviteFlow,
    propertyTitle,
    invitedName: invitedName || stored?.invitedName || null,
    invitedEmail,
    studentOnly,
    offeredWeeklyRentAud: stored?.offeredWeeklyRentAud ?? null,
    offerReason: stored?.offerReason ?? null,
  }
}
