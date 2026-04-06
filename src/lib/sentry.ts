import type { Integration } from '@sentry/core'
import * as Sentry from '@sentry/react'
import { Capacitor } from '@capacitor/core'

const dsn = import.meta.env.VITE_SENTRY_DSN
if (typeof dsn === 'string' && dsn.trim() !== '') {
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform()
  // Session Replay patches the DOM aggressively; it often breaks or blanks Capacitor WebViews.
  const integrations: Integration[] = [Sentry.browserTracingIntegration()]
  if (!isNative) {
    integrations.push(Sentry.replayIntegration())
  }

  try {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      integrations,
      tracesSampleRate: isNative ? 0.1 : 0.2,
      replaysSessionSampleRate: isNative ? 0 : 0.1,
      replaysOnErrorSampleRate: isNative ? 0 : 1.0,
      sendDefaultPii: false,
      // Ignore known Supabase browser auth lock race noise.
      beforeSend(event, hint) {
        const msg =
          (hint.originalException instanceof Error ? hint.originalException.message : undefined) ||
          event.message ||
          ''
        if (msg.includes('lock:sb-') && msg.includes('another request stole it')) {
          return null
        }
        // Normal form validation copy — never noise in Sentry (defense in depth if captured elsewhere).
        if (
          msg.includes('Please accept the Terms of Service and Privacy Policy to continue') ||
          msg === 'Terms not accepted'
        ) {
          return null
        }
        return event
      },
    })
  } catch (err) {
    console.warn('[Sentry] init failed', err)
  }
}
