/** Absolute OAuth return URL — add this path in Supabase Auth → URL Configuration → Redirect URLs */
export function getAuthCallbackUrl() {
  return `${window.location.origin}/auth/callback`
}

/**
 * Google OAuth options. Explicit openid + email + profile avoids failures for some Google / Workspace accounts.
 * @see https://supabase.com/docs/guides/troubleshooting/google-auth-fails-for-some-users
 */
export function getGoogleOAuthOptions() {
  return {
    redirectTo: getAuthCallbackUrl(),
    scopes: 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
  }
}
