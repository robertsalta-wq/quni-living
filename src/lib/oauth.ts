/**
 * OAuth return URL after Google (etc.). Must be listed in Supabase → Authentication → URL Configuration → Redirect URLs
 * (e.g. http://localhost:5173/auth/callback and your production /auth/callback).
 */
export function getAuthCallbackUrl() {
  return `${window.location.origin}/auth/callback`
}

/** Richer copy for resend/signup mail failures (redirect allow-list is a common cause). */
export function formatAuthEmailErrorMessage(err: unknown): string {
  let msg = err instanceof Error ? err.message : 'Request failed.'
  if (err && typeof err === 'object' && 'status' in err) {
    const s = (err as { status?: number }).status
    if (typeof s === 'number') msg = `${msg} (HTTP ${s})`
  }
  const lower = msg.toLowerCase()
  if (
    lower.includes('redirect') &&
    (lower.includes('not allowed') || lower.includes('invalid') || lower.includes('whitelist'))
  ) {
    const cb = typeof window !== 'undefined' ? getAuthCallbackUrl() : '/auth/callback'
    return `${msg}\n\nAdd this exact URL under Supabase → Authentication → URL Configuration → Redirect URLs: ${cb}\nSet Site URL to: ${typeof window !== 'undefined' ? window.location.origin : '(your live origin)'}`
  }
  return msg
}

/**
 * Google OAuth options. Explicit openid + email + profile avoids failures for some Google / Workspace accounts.
 * @see https://supabase.com/docs/guides/troubleshooting/google-auth-fails-for-some-users
 */
export function getGoogleOAuthOptions() {
  return {
    redirectTo: getAuthCallbackUrl(),
    scopes: 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    // Forces Google to show the account picker so "Log out → Log in with a different Gmail"
    // doesn't automatically reuse the previously authenticated Google session.
    queryParams: { prompt: 'select_account' },
  }
}
