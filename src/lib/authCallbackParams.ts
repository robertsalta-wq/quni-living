import { marketplaceRoleForWrite } from './marketplaceRole'

/** Email OTP links use `type=signup` (confirm) or `type=recovery` (password reset). */
export type AuthCallbackOtpType = 'signup' | 'recovery'

export type GoogleOAuthSignupRoute = 'student' | 'non_student'
export type GoogleOAuthSignupRole = 'renter' | 'landlord'

function normalizeOAuthSignupRole(role: unknown): GoogleOAuthSignupRole | null {
  if (typeof role !== 'string') return null
  const trimmed = role.trim()
  if (trimmed === 'student' || trimmed === 'renter' || trimmed === 'landlord') {
    return marketplaceRoleForWrite(trimmed) as GoogleOAuthSignupRole | null
  }
  return null
}

export type OAuthSignupCallbackParams = {
  signupRoute: GoogleOAuthSignupRoute | null
  signupRole: GoogleOAuthSignupRole | null
}

const OAUTH_SIGNUP_CONTEXT_KEY = 'quni_oauth_signup_context'

/** Persist signup role/route before OAuth — redirectTo must stay the bare allow-listed callback URL. */
export function rememberOAuthSignupContext(params: OAuthSignupCallbackParams): void {
  if (typeof window === 'undefined') return
  if (!params.signupRoute && !params.signupRole) return
  try {
    const stored: OAuthSignupCallbackParams = {
      signupRoute: params.signupRoute,
      signupRole: params.signupRole
        ? (marketplaceRoleForWrite(params.signupRole) as GoogleOAuthSignupRole | null)
        : null,
    }
    sessionStorage.setItem(OAUTH_SIGNUP_CONTEXT_KEY, JSON.stringify(stored))
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearOAuthSignupContext(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(OAUTH_SIGNUP_CONTEXT_KEY)
  } catch {
    /* ignore */
  }
}

function consumeOAuthSignupContext(): OAuthSignupCallbackParams | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(OAUTH_SIGNUP_CONTEXT_KEY)
    if (!raw) return null
    sessionStorage.removeItem(OAUTH_SIGNUP_CONTEXT_KEY)
    const parsed = JSON.parse(raw) as Partial<OAuthSignupCallbackParams>
    const route = parsed.signupRoute
    return {
      signupRoute: route === 'student' || route === 'non_student' ? route : null,
      signupRole: normalizeOAuthSignupRole(parsed.signupRole),
    }
  } catch {
    clearOAuthSignupContext()
    return null
  }
}

/** URL params first (legacy links), then sessionStorage written before signInWithOAuth. */
export function resolveOAuthSignupParams(search: string): OAuthSignupCallbackParams {
  const fromUrl = parseOAuthSignupParamsFromSearch(search)
  if (fromUrl.signupRoute || fromUrl.signupRole) {
    clearOAuthSignupContext()
    return fromUrl
  }
  return consumeOAuthSignupContext() ?? { signupRoute: null, signupRole: null }
}

/** Legacy OAuth callback links may still carry signup_route / signup_role on the query string. */
export function parseOAuthSignupParamsFromSearch(search: string): OAuthSignupCallbackParams {
  const params = new URLSearchParams(search)
  const route = params.get('signup_route')?.trim()
  const role = params.get('signup_role')?.trim()
  return {
    signupRoute: route === 'student' || route === 'non_student' ? route : null,
    signupRole: normalizeOAuthSignupRole(role),
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

function hasImplicitAuthHash(hash: string): boolean {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  return Boolean(
    params.get('access_token') ||
      params.get('refresh_token') ||
      params.get('error') ||
      params.get('error_code') ||
      params.get('error_description'),
  )
}

/**
 * Supabase may substitute `.RedirectTo` with Site URL (no path) when the redirect is not
 * allow-listed — links then land on `/` with `?token_hash=…` (email) or `#access_token=…`
 * (implicit OAuth). Forward those to `/auth/callback` so `detectSessionInUrl` can run.
 */
export function apexAuthTokenRedirectPath(
  pathname: string,
  search: string,
  hash: string = '',
): string | null {
  const path = pathname.replace(/\/$/, '') || '/'
  if (path !== '/') return null
  const normalizedHash = !hash ? '' : hash.startsWith('#') ? hash : `#${hash}`
  if (parseAuthTokenHashFromSearch(search)) {
    return `/auth/callback${search}${normalizedHash}`
  }
  if (hasImplicitAuthHash(normalizedHash)) {
    return `/auth/callback${search}${normalizedHash}`
  }
  return null
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
