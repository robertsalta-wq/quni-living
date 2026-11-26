/** Per server instance. 60 Google address lookups per user per minute. */
export const PLACES_RATE_LIMIT = 60
export const PLACES_RATE_WINDOW_MS = 60 * 1000

/** @type {Map<string, number[]>} */
const hitsByUser = new Map()

/**
 * @param {string} userId
 * @param {number} [now]
 * @returns {boolean} true when the request is allowed
 */
export function consumePlacesRateLimit(userId, now = Date.now()) {
  const prev = (hitsByUser.get(userId) ?? []).filter((t) => now - t < PLACES_RATE_WINDOW_MS)
  if (prev.length >= PLACES_RATE_LIMIT) {
    hitsByUser.set(userId, prev)
    return false
  }
  prev.push(now)
  hitsByUser.set(userId, prev)
  return true
}

export function resetPlacesRateLimitForTests() {
  hitsByUser.clear()
}
