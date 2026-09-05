const WINDOW_MS = 15 * 60 * 1000
const MAX_HITS = 20

const hitsByKey = new Map<string, number[]>()

export function consumeQldHouseRulesRateLimit(key: string): boolean {
  const now = Date.now()
  const prev = (hitsByKey.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  if (prev.length >= MAX_HITS) {
    hitsByKey.set(key, prev)
    return false
  }
  prev.push(now)
  hitsByKey.set(key, prev)
  return true
}

export function qldHouseRulesClientKey(forwardedFor: string, fallback = 'unknown'): string {
  const first = forwardedFor.split(',')[0]?.trim() ?? ''
  return first || fallback
}
