/** Set when we auto-reload once after a stale lazy-chunk failure (post-deploy). */
export const CHUNK_RELOAD_SESSION_KEY = 'quni_chunk_reload'

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

/** One automatic full reload; returns true if a reload was triggered. */
export function recoverFromStaleChunkLoad(reason: unknown): boolean {
  if (typeof window === 'undefined' || !isStaleChunkLoadError(reason)) return false
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY) === '1') return false
    sessionStorage.setItem(CHUNK_RELOAD_SESSION_KEY, '1')
  } catch {
    // private mode / blocked storage - still try reload once
  }
  window.location.reload()
  return true
}

export function clearChunkReloadSessionFlag(): void {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_SESSION_KEY)
  } catch {
    // ignore
  }
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
