import { clearQuniTenantInviteContext, getQuniTenantInviteDisplayContext } from './quniTenantInvite'
import { clearPostAuthRedirect, isSafeInternalPath, peekPostAuthRedirect } from './postAuthRedirect'

export type TenantInviteSignupHints = {
  isTenantInviteFlow: boolean
  propertyTitle: string | null
  invitedName: string | null
  invitedEmail: string | null
  studentOnly: boolean
}

function redirectHasInviteToken(redirect: string | null): boolean {
  if (!redirect || !isSafeInternalPath(redirect)) return false
  return redirect.includes('invite=')
}

/** URL or session redirect still points at an invite-driven signup / login flow. */
export function isActiveTenantInviteAuthUrl(searchParams: URLSearchParams): boolean {
  if (searchParams.get('invited_email')?.trim()) return true
  if (searchParams.get('invited_name')?.trim()) return true
  if (searchParams.get('invite_property')?.trim()) return true
  if (searchParams.get('invite_student_only') === '1') return true
  if (redirectHasInviteToken(searchParams.get('redirect'))) return true
  if (redirectHasInviteToken(peekPostAuthRedirect())) return true
  return false
}

/**
 * Drop persisted invite state when the user opens generic signup/login (not from an invite link).
 * localStorage survives until booking completes; without this it sticks across unrelated visits.
 */
export function abandonStaleTenantInviteUnlessActive(searchParams: URLSearchParams): void {
  if (isActiveTenantInviteAuthUrl(searchParams)) return
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

  const isTenantInviteFlow = Boolean(
    invitedEmail ||
      invitedName ||
      searchParams.get('invite_property')?.trim() ||
      fromRedirect ||
      fromSessionRedirect,
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
  }
}
