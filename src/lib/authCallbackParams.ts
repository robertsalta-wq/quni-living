/** Signup confirmation links use `type=signup` (Confirm signup template). */
export type SignupConfirmationOtpType = 'signup'

export function parseSignupTokenHashFromSearch(search: string): {
  token_hash: string
  type: SignupConfirmationOtpType
} | null {
  const params = new URLSearchParams(search)
  const token_hash = params.get('token_hash')?.trim()
  const type = params.get('type')?.trim()
  if (!token_hash || type !== 'signup') return null
  return { token_hash, type: 'signup' }
}

/** Remove one-time auth params so refresh does not retry verification. */
export function stripSensitiveAuthCallbackQueryParams(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.delete('token_hash')
  url.searchParams.delete('type')
  url.searchParams.delete('code')
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(window.history.state, '', next)
}
