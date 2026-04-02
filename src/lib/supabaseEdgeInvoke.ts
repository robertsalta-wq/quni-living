import { supabase } from './supabase'

/**
 * Edge Functions need a valid user JWT in `Authorization`. Refreshes when the
 * token is missing or close to expiry so we do not send an expired JWT.
 */
export async function getValidAccessTokenForFunctions(): Promise<
  { token: string } | { error: string }
> {
  const { data: first } = await supabase.auth.getSession()
  let session = first.session
  const now = Math.floor(Date.now() / 1000)
  const exp = session?.expires_at ?? 0
  const needsRefresh = !session?.access_token || exp < now + 120

  if (needsRefresh) {
    const { data, error } = await supabase.auth.refreshSession()
    if (error || !data.session?.access_token) {
      return {
        error: 'Your session expired. Sign out and sign in again, then retry verification.',
      }
    }
    session = data.session
  }

  if (!session?.access_token) {
    return {
      error: 'Your session expired. Sign out and sign in again, then retry verification.',
    }
  }
  return { token: session.access_token }
}
