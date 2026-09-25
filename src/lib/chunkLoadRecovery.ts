/** Timestamp (ms) of the last auto-reload after a stale lazy-chunk failure (post-deploy). */
export const CHUNK_RELOAD_SESSION_KEY = 'quni_chunk_reload'

/** Query param used when sessionStorage cannot persist the cooldown across reloads. */
export const CHUNK_RELOAD_QUERY_PARAM = '_qcr'

/**
 * Suppress further auto-reloads for this long after one fires.
 * Prevents a loop when main.js used to clear a one-shot flag before hydrate, or when a
 * warm/prefetch of a hashed chunk keeps failing after reload.
 */
export const CHUNK_RELOAD_COOLDOWN_MS = 60_000

/** In-memory fallback for duplicate error events before navigation completes. */
let lastReloadAtMemory: number | null = null

/** Lazy route failed because the browser requested an old hashed asset (SPA returned index.html). */
export function isStaleChunkLoadError(reason: unknown): boolean {
  const msg = reason instanceof Error ? reason.message : String(reason ?? '')
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('not a valid JavaScript MIME type') ||
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError')
  )
}

function readQueryReloadAt(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = new URL(window.location.href).searchParams.get(CHUNK_RELOAD_QUERY_PARAM)
    if (raw == null || raw === '') return null
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

function readStorageReloadAt(): number | null {
  try {
    const raw = sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY)
    if (raw == null || raw === '') return null
    // Legacy one-shot flag from older clients.
    if (raw === '1') return Date.now()
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

function readLastReloadAt(): number | null {
  return readQueryReloadAt() ?? readStorageReloadAt() ?? lastReloadAtMemory
}

function persistReloadAt(at: number): 'storage' | 'query' {
  lastReloadAtMemory = at
  try {
    sessionStorage.setItem(CHUNK_RELOAD_SESSION_KEY, String(at))
    return 'storage'
  } catch {
    return 'query'
  }
}

/** True when an auto-reload already ran inside the cooldown window. */
export function isChunkReloadInCooldown(now = Date.now()): boolean {
  const last = readLastReloadAt()
  if (last == null) return false
  return now - last < CHUNK_RELOAD_COOLDOWN_MS
}

/**
 * One automatic full reload per cooldown window; returns true if navigation was triggered.
 * Uses sessionStorage when available; otherwise navigates via `?_qcr=<ts>` so the cooldown
 * survives without storage.
 */
export function recoverFromStaleChunkLoad(reason: unknown, now = Date.now()): boolean {
  if (typeof window === 'undefined' || !isStaleChunkLoadError(reason)) return false
  if (isChunkReloadInCooldown(now)) return false

  const mode = persistReloadAt(now)
  if (mode === 'query') {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set(CHUNK_RELOAD_QUERY_PARAM, String(now))
      window.location.replace(url.toString())
      return true
    } catch {
      // fall through to reload
    }
  }
  window.location.reload()
  return true
}

/** Remove `?_qcr=` from the address bar after a healthy boot. Keeps sessionStorage cooldown. */
export function stripChunkReloadQueryParam(): void {
  if (typeof window === 'undefined') return
  try {
    const url = new URL(window.location.href)
    if (!url.searchParams.has(CHUNK_RELOAD_QUERY_PARAM)) return
    url.searchParams.delete(CHUNK_RELOAD_QUERY_PARAM)
    const next = url.pathname + url.search + url.hash
    window.history.replaceState(window.history.state, '', next)
  } catch {
    // ignore
  }
}

/** Drop all cooldown markers (tests only / explicit reset). */
export function clearChunkReloadSessionFlag(): void {
  lastReloadAtMemory = null
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_SESSION_KEY)
  } catch {
    // ignore
  }
  stripChunkReloadQueryParam()
}

export function registerStaleChunkLoadRecovery(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('unhandledrejection', (event) => {
    if (recoverFromStaleChunkLoad(event.reason)) {
      event.preventDefault()
    }
  })

  window.addEventListener('error', (event) => {
    if (recoverFromStaleChunkLoad(event.error ?? event.message)) {
      event.preventDefault()
    }
  })
}
