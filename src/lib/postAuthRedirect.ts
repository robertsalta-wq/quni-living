const KEY = 'quni_post_auth_redirect'

export function isSafeInternalPath(p: string): boolean {
  if (!p.startsWith('/') || p.startsWith('//')) return false
  if (p.includes('://')) return false
  return true
}

/**
 * Paths that must not override role-based post-login routing. Typical case: user opens Log in from
 * the marketing home (`state.from` or stored redirect is `/`), which would otherwise send landlords
 * and students to `/` instead of their dashboard.
 */
export function isShallowReturnIntentPath(p: string): boolean {
  return p === '/'
}

/** Persist ?redirect= for OAuth flows that lose the query string on return. */
export function rememberPostAuthRedirectFromSearch(searchParams: URLSearchParams): void {
  const raw = searchParams.get('redirect')
  if (!raw) return
  try {
    const decoded = decodeURIComponent(raw)
    if (isSafeInternalPath(decoded) && !isShallowReturnIntentPath(decoded)) sessionStorage.setItem(KEY, decoded)
  } catch {
    /* ignore malformed */
  }
}

export function setPostAuthRedirect(path: string): void {
  if (isSafeInternalPath(path) && !isShallowReturnIntentPath(path)) sessionStorage.setItem(KEY, path)
}

export function peekPostAuthRedirect(): string | null {
  const v = sessionStorage.getItem(KEY)
  if (!v || !isSafeInternalPath(v)) return null
  if (isShallowReturnIntentPath(v)) {
    sessionStorage.removeItem(KEY)
    return null
  }
  return v
}

export function consumePostAuthRedirect(): string | null {
  const v = peekPostAuthRedirect()
  if (v) sessionStorage.removeItem(KEY)
  return v
}

/** On Login/Signup mount: store ?redirect= and, if absent, React Router `location.state.from`. */
export function persistAuthReturnIntent(searchParams: URLSearchParams, locationState: unknown): void {
  rememberPostAuthRedirectFromSearch(searchParams)
  if (searchParams.get('redirect')) return
  const from = (locationState as { from?: { pathname?: string } })?.from?.pathname
  if (
    from &&
    isSafeInternalPath(from) &&
    !isShallowReturnIntentPath(from) &&
    from !== '/login' &&
    from !== '/signup'
  ) {
    setPostAuthRedirect(from)
  }
}

/**
 * Prefer ?redirect=, then `state.from`, then session storage. Clears storage when a path is chosen from
 * query or state so we do not double-consume.
 */
export function resolvePostLoginDestination(
  searchParams: URLSearchParams,
  locationState: unknown,
): string | null {
  const raw = searchParams.get('redirect')
  if (raw) {
    try {
      const decoded = decodeURIComponent(raw)
      if (isSafeInternalPath(decoded) && !isShallowReturnIntentPath(decoded)) {
        sessionStorage.removeItem(KEY)
        return decoded
      }
    } catch {
      /* ignore */
    }
  }
  const from = (locationState as { from?: { pathname?: string } })?.from?.pathname
  if (from && isSafeInternalPath(from) && from !== '/login' && !isShallowReturnIntentPath(from)) {
    sessionStorage.removeItem(KEY)
    return from
  }
  return consumePostAuthRedirect()
}
