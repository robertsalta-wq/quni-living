/**
 * One-shot post-login redirect flag (`awaitingSignInOnboardingRedirect`).
 *
 * Arm only on a real `SIGNED_IN`. Do **not** clear on `INITIAL_SESSION` — Supabase can emit
 * INITIAL_SESSION after SIGNED_IN in the same OAuth boot, which previously wiped the one-shot
 * and left freshly signed-in users on marketing `/`.
 *
 * Cold load / returning sessions only get INITIAL_SESSION (flag stays false), so marketing `/`
 * and logo → `/` remain unchanged.
 */
export function authEventArmsPostLoginRedirect(event: string): boolean {
  return event === 'SIGNED_IN'
}

export function authEventClearsPostLoginRedirect(event: string): boolean {
  return event === 'SIGNED_OUT'
}
