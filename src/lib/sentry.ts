import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN
if (typeof dsn === 'string' && dsn.trim() !== '') {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
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
      return event
    },
  })
}
