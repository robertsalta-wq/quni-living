import type { GoogleOAuthSignupRole, GoogleOAuthSignupRoute } from './oauth'

/** Email OTP links use `type=signup` (confirm) or `type=recovery` (password reset). */
export type AuthCallbackOtpType = 'signup' | 'recovery'

export type OAuthSignupCallbackParams = {
  signupRoute: GoogleOAuthSignupRoute | null
  signupRole: GoogleOAuthSignupRole | null
}

/** OAuth signup redirectTo query params (survive the round trip when localStorage does not). */
export function parseOAuthSignupParamsFromSearch(search: string): OAuthSignupCallbackParams {
  const params = new URLSearchParams(search)
  const route = params.get('signup_route')?.trim()
  const role = params.get('signup_role')?.trim()
  return {
    signupRoute: route === 'student' || route === 'non_student' ? route : null,
    signupRole: role === 'student' || role === 'landlord' ? role : null,
  }
}

export type SignupConfirmationOtpType = 'signup'

export function parseAuthTokenHashFromSearch(search: string): {
  token_hash: string
  type: AuthCallbackOtpType
} | null {
  const params = new URLSearchParams(search)
  const token_hash = params.get('token_hash')?.trim()
  const type = params.get('type')?.trim()
  if (!token_hash || (type !== 'signup' && type !== 'recovery')) return null
  return { token_hash, type }
}

/** Signup confirmation links use `type=signup` (Confirm signup template). */
export function parseSignupTokenHashFromSearch(search: string): {
  token_hash: string
  type: SignupConfirmationOtpType
} | null {
  const parsed = parseAuthTokenHashFromSearch(search)
  if (!parsed || parsed.type !== 'signup') return null
  return { token_hash: parsed.token_hash, type: 'signup' }
}

/** Password recovery links use `type=recovery` (Reset password template). */
export function parseRecoveryTokenHashFromSearch(search: string): {
  token_hash: string
  type: 'recovery'
} | null {
  const parsed = parseAuthTokenHashFromSearch(search)
  if (!parsed || parsed.type !== 'recovery') return null
  return { token_hash: parsed.token_hash, type: 'recovery' }
}

export function isPasswordRecoveryCallbackSearch(search: string): boolean {
  const params = new URLSearchParams(search)
  return params.get('type')?.trim() === 'recovery'
}

export function isPasswordRecoveryCallbackHash(hash: string): boolean {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  return params.get('type') === 'recovery'
}

/** Remove one-time auth params so refresh does not retry verification. */
export function stripSensitiveAuthCallbackQueryParams(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.delete('token_hash')
  url.searchParams.delete('type')
  url.searchParams.delete('code')
  url.searchParams.delete('signup_route')
  url.searchParams.delete('signup_role')
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(window.history.state, '', next)
}

/** Drop implicit-flow hash tokens after session is established. */
export function stripAuthCallbackHashFragment(): void {
  if (typeof window === 'undefined') return
  if (!window.location.hash) return
  const url = new URL(window.location.href)
  url.hash = ''
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`)
}
