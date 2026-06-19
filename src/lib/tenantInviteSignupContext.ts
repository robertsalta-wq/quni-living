import { getQuniTenantInviteToken, getQuniTenantInviteDisplayContext } from './quniTenantInvite'
import { isSafeInternalPath } from './postAuthRedirect'

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

/** Signup / login UI hints when the prospect arrived via a landlord tenant invite link. */
export function resolveTenantInviteSignupHints(searchParams: URLSearchParams): TenantInviteSignupHints {
  const invitedEmail = searchParams.get('invited_email')?.trim() || null
  const invitedName = searchParams.get('invited_name')?.trim() || null
  const redirect = searchParams.get('redirect')
  const fromRedirect = redirectHasInviteToken(redirect)
  const fromToken = Boolean(getQuniTenantInviteToken())
  const stored = getQuniTenantInviteDisplayContext()

  const isTenantInviteFlow = Boolean(invitedEmail || fromRedirect || fromToken)

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
