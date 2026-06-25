import { waitUntil } from '@vercel/functions'

/**
 * Best-effort Sentry event for Vercel Edge routes (no @sentry/node in bundle).
 * Env: SENTRY_DSN or VITE_SENTRY_DSN
 */
/**
 * @param {string} message
 * @param {Record<string, unknown> | unknown} [extra]
 * @param {{ level?: 'warning' | 'error' | 'info'; tags?: Record<string, string>; fingerprint?: string[] }} [options]
 */
async function captureSentryMessageEdgeCore(message, extra, options) {
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
    const level =
      options?.level === 'warning' || options?.level === 'info' || options?.level === 'error'
        ? options.level
        : 'error'
    const payload = {
      event_id: eventId,
      timestamp: new Date().toISOString().slice(0, 19),
      platform: 'node',
      level,
      logger: 'quni-edge',
      message: { formatted: String(message) },
      extra: extra && typeof extra === 'object' ? extra : { detail: extra },
      ...(options?.tags && typeof options.tags === 'object' ? { tags: options.tags } : {}),
      ...(Array.isArray(options?.fingerprint) && options.fingerprint.length > 0
        ? { fingerprint: options.fingerprint }
        : {}),
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

/**
 * Fire-safe Sentry post for edge handlers. Never throws.
 * Registers the fetch with waitUntil so void call sites persist after a fast response.
 * Callers that await still get the same promise.
 *
 * @param {string} message
 * @param {Record<string, unknown> | unknown} [extra]
 * @param {{ level?: 'warning' | 'error' | 'info'; tags?: Record<string, string>; fingerprint?: string[] }} [options]
 * @returns {Promise<void>}
 */
export function captureSentryMessageEdge(message, extra, options) {
  const work = captureSentryMessageEdgeCore(message, extra, options)
  waitUntil(work)
  return work
}
