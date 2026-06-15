/**
 * Supabase Auth `getUser()` when the JWT `sub` is not present in `auth.users`
 * (deleted user, project reset, wrong Supabase project, or stale local storage).
 */
export function isStaleOrInvalidJwtUserError(message: string | null | undefined): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return m.includes('user from sub claim') && m.includes('does not exist')
}

function authErrorRawMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'Sign-in failed.'
}

/** User-facing copy for email/password and OAuth sign-in failures. */
export function formatAuthLoginErrorMessage(err: unknown): string {
  const raw = authErrorRawMessage(err)
  const lower = raw.toLowerCase()

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed')
  ) {
    return "We couldn't connect right now. Check your internet connection, try disabling ad blockers for this site, and sign in again."
  }

  if (lower.includes('invalid login credentials') || lower.includes('invalid email or password')) {
    return 'Incorrect email or password. If you signed up recently, confirm your email first.'
  }

  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in. Check your inbox (and spam) for the confirmation link.'
  }

  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many sign-in attempts. Please wait a few minutes and try again.'
  }

  if (/supabase\.co|\.supabase\./i.test(raw)) {
    return 'Sign-in failed. Please try again in a moment.'
  }

  return raw
}