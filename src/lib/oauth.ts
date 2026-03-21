/** Absolute OAuth return URL — add this path in Supabase Auth → URL Configuration → Redirect URLs */
export function getAuthCallbackUrl() {
  return `${window.location.origin}/auth/callback`
}
