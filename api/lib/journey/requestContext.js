const MOBILE_UA = /Mobi|Android|iPhone|iPad|iPod/i

/**
 * @param {Request | { headers?: { get?: (name: string) => string | null } } | null | undefined} request
 * @returns {{ user_agent: string; is_mobile: boolean }}
 */
export function requestContextFromRequest(request) {
  const raw = request?.headers?.get?.('user-agent') ?? ''
  const user_agent = raw.slice(0, 400)
  return { user_agent, is_mobile: MOBILE_UA.test(user_agent) }
}

/**
 * @param {Record<string, unknown> | null | undefined} existing
 * @param {{ user_agent: string; is_mobile: boolean } | null | undefined} deviceCtx
 * @returns {Record<string, unknown>}
 */
export function mergeDeviceContextMetadata(existing, deviceCtx) {
  if (!deviceCtx) return existing ?? {}
  return { ...(existing ?? {}), ...deviceCtx }
}
