import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { appNavigateTo } from './appNavigate'
import { isSupabaseConfigured, supabase } from './supabase'

type ParsedOAuthUrl = {
  access_token: string | undefined
  refresh_token: string | undefined
  error: string | undefined
  error_description: string | undefined
}

function parseOAuthParamsFromUrl(urlString: string): ParsedOAuthUrl | null {
  let url: URL
  try {
    url = new URL(urlString)
  } catch {
    return null
  }

  const search = new URLSearchParams(url.search)
  const hash = url.hash?.startsWith('#') ? url.hash.slice(1) : (url.hash ?? '')
  const hashParams = new URLSearchParams(hash)
  const get = (key: string) => search.get(key) ?? hashParams.get(key)

  const access_token = get('access_token') ?? undefined
  const refresh_token = get('refresh_token') ?? undefined
  const error = get('error') ?? undefined
  const error_description = get('error_description') ?? undefined

  if (!access_token && !refresh_token && !error) {
    return null
  }

  return { access_token, refresh_token, error, error_description }
}

/** Avoid double-handling when both `getLaunchUrl` and `appUrlOpen` deliver the same URL. */
const handledOAuthUrls = new Set<string>()

async function handleOAuthDeepLink(url: string): Promise<void> {
  const parsed = parseOAuthParamsFromUrl(url)
  if (!parsed) return

  if (handledOAuthUrls.has(url)) return
  handledOAuthUrls.add(url)

  if (!isSupabaseConfigured) {
    appNavigateTo('/login?error=config', { replace: true })
    return
  }

  if (parsed.error) {
    const msg = parsed.error_description?.replace(/\+/g, ' ') ?? parsed.error
    appNavigateTo(`/login?error=oauth&detail=${encodeURIComponent(msg)}`, { replace: true })
    return
  }

  if (parsed.access_token && parsed.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
    })
    if (error) {
      console.warn('[OAuth deep link] setSession failed', error)
      appNavigateTo(`/login?error=auth_failed&detail=${encodeURIComponent(error.message)}`, {
        replace: true,
      })
      return
    }
    // Use React Router — full `location.replace('/auth/callback')` hits the static server with no
    // SPA fallback in Capacitor WebView (404 / blank screen).
    appNavigateTo('/auth/callback', { replace: true })
    return
  }

  console.warn('[OAuth deep link] Missing access_token or refresh_token in callback URL')
  appNavigateTo(
    '/login?error=auth_failed&detail=' +
      encodeURIComponent('Sign-in callback was incomplete. Try signing in again.'),
    { replace: true },
  )
}

/**
 * Native-only: consume `com.quni.living://auth/callback` (and fragment/query tokens)
 * when the OS returns from OAuth. Web continues to use `/auth/callback` unchanged.
 */
export function registerNativeOAuthDeepLinkHandler(): void {
  if (!Capacitor.isNativePlatform()) return

  void App.addListener('appUrlOpen', ({ url }) => {
    void handleOAuthDeepLink(url)
  })

  void App.getLaunchUrl().then((launch) => {
    if (launch?.url) void handleOAuthDeepLink(launch.url)
  })
}
