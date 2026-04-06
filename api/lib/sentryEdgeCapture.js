/**
 * Best-effort Sentry event for Vercel Edge routes (no @sentry/node in bundle).
 * Env: SENTRY_DSN or VITE_SENTRY_DSN
 */
export async function captureSentryMessageEdge(message, extra) {
  const dsn = (process.env.SENTRY_DSN || process.env.VITE_SENTRY_DSN || '').trim()
  if (!dsn) {
    console.error('[Sentry skipped]', message, extra)
    return
  }
  try {
    const u = new URL(dsn)
    const key = u.username
    const projectId = u.pathname.replace(/^\//, '')
    const host = u.host
    const eventId = crypto.randomUUID().replace(/-/g, '')
    const payload = {
      event_id: eventId,
      timestamp: new Date().toISOString().slice(0, 19),
      platform: 'node',
      level: 'error',
      logger: 'quni-edge',
      message: { formatted: String(message) },
      extra: extra && typeof extra === 'object' ? extra : { detail: extra },
    }
    const storeUrl = `https://${host}/api/${projectId}/store/?sentry_version=7&sentry_key=${encodeURIComponent(key)}&sentry_client=quni-edge/1.0`
    await fetch(storeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (e) {
    console.error('Sentry capture failed', e)
  }
}
