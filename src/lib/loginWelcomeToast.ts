const LOGIN_WELCOME_PENDING_KEY = 'quni_login_welcome_pending'

/** Set when auth flow redirects to a dashboard after sign-in (consumed once on landing). */
export function stashLoginWelcomePending(): void {
  try {
    sessionStorage.setItem(LOGIN_WELCOME_PENDING_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function consumeLoginWelcomePending(): boolean {
  try {
    const v = sessionStorage.getItem(LOGIN_WELCOME_PENDING_KEY)
    if (v) sessionStorage.removeItem(LOGIN_WELCOME_PENDING_KEY)
    return v === '1'
  } catch {
    return false
  }
}
