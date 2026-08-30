/**
 * GoTrue recovers the stored session on window/tab focus (`visibilitychange` →
 * `_recoverAndRefresh`) and notifies `SIGNED_IN` for the same user. That is not a
 * new login. Treating it as one remounts protected routes and `PostAuthOnboardingRedirect`
 * sends landlords back to `/landlord/dashboard` (listing edit closes).
 */
export function authEventIsExistingSessionSignedIn(
  event: string,
  incomingUserId: string | null | undefined,
  establishedUserId: string | null | undefined,
): boolean {
  return (
    event === 'SIGNED_IN' &&
    Boolean(incomingUserId) &&
    incomingUserId === establishedUserId
  )
}

/**
 * One-shot post-login redirect flag (`awaitingSignInOnboardingRedirect`).
 *
 * Arm only on a real `SIGNED_IN`. Do **not** clear on `INITIAL_SESSION` - Supabase can emit
 * INITIAL_SESSION after SIGNED_IN in the same OAuth boot, which previously wiped the one-shot
 * and left freshly signed-in users on marketing `/`.
 *
 * Cold load / returning sessions only get INITIAL_SESSION (flag stays false), so marketing `/`
 * and logo → `/` remain unchanged.
 *
 * Same-user `SIGNED_IN` (tab/window focus recovery) must not arm the flag.
 */
export function authEventArmsPostLoginRedirect(
  event: string,
  incomingUserId?: string | null,
  establishedUserId?: string | null,
): boolean {
  if (event !== 'SIGNED_IN') return false
  if (authEventIsExistingSessionSignedIn(event, incomingUserId, establishedUserId)) return false
  return true
}

export function authEventClearsPostLoginRedirect(event: string): boolean {
  return event === 'SIGNED_OUT'
}
