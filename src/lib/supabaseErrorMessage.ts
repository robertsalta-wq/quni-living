/** Supabase/PostgREST errors are plain objects with `message`, not always `instanceof Error`. */
export function messageFromSupabaseError(err: unknown): string {
  if (err == null) return 'Unknown error'
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message
  }
  return 'Something went wrong.'
}

/**
 * Browser `fetch()` never completed. Chrome: "Failed to fetch"; Sentry may append
 * `(host)` when enhanceFetchErrorMessages is `always`; postgrest-js prefixes `TypeError:`.
 */
export function isBrowserNetworkFailure(err: unknown): boolean {
  const m = messageFromSupabaseError(err).toLowerCase()
  return (
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('network request failed') ||
    m.includes('load failed') ||
    m.includes('fetcherror:')
  )
}

export const BROWSER_NETWORK_FAILURE_COPY =
  "We couldn't connect right now. Check your internet connection, try disabling ad blockers for this site, then try again."

/**
 * Copy safe to show landlords/renters. Hides TypeError, fetch internals, and supabase hosts.
 */
export function formatUserFacingRequestError(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (isBrowserNetworkFailure(err)) return BROWSER_NETWORK_FAILURE_COPY
  const raw = messageFromSupabaseError(err).trim()
  if (!raw) return fallback
  if (/supabase\.co|\.supabase\./i.test(raw)) return fallback
  if (/^(typeerror|fetcherror|error):/i.test(raw)) return fallback
  return raw
}

/** Typical PostgREST message when a column is not in the exposed schema. */
export function looksLikeMissingDbColumn(err: unknown): boolean {
  const m = messageFromSupabaseError(err).toLowerCase()
  return (
    m.includes('schema cache') ||
    m.includes('could not find') ||
    (m.includes('column') && (m.includes('does not exist') || m.includes('unknown')))
  )
}
