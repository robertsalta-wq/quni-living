/** In-process TTL cache for Search Console snapshots (warm lambdas). No DB migration. */

export const SEARCH_CONSOLE_CACHE_TTL_MS = 60 * 60 * 1000

type Entry = { payload: unknown; fetchedAt: string }

const store = new Map<string, Entry>()

export type CachedRow<T> = {
  payload: T
  fetchedAt: string
  fresh: boolean
}

export function readSearchConsoleCacheMemory<T>(endpoint: string): CachedRow<T> | null {
  const row = store.get(endpoint)
  if (!row) return null
  const age = Date.now() - new Date(row.fetchedAt).getTime()
  return {
    payload: row.payload as T,
    fetchedAt: row.fetchedAt,
    fresh: age >= 0 && age < SEARCH_CONSOLE_CACHE_TTL_MS,
  }
}

export function writeSearchConsoleCacheMemory(endpoint: string, payload: unknown): void {
  store.set(endpoint, {
    payload,
    fetchedAt: new Date().toISOString(),
  })
}
