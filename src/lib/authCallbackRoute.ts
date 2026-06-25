/** True while the SPA is handling `/auth/callback` (email confirm, OAuth, magic link). */
export function isAuthCallbackRoute(pathname: string = window.location.pathname): boolean {
  return pathname.startsWith('/auth/callback')
}
