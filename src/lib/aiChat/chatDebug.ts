/**
 * Opt-in chat diagnostics. In production, run in the console then reload:
 *   localStorage.setItem('quni_debug_chat', '1'); location.reload()
 * Turn off: localStorage.removeItem('quni_debug_chat'); location.reload()
 * In Vite dev, logging is always on.
 */
export function isChatDebugEnabled(): boolean {
  if (import.meta.env.DEV) return true
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem('quni_debug_chat') === '1'
  } catch {
    return false
  }
}

export function chatDebug(message: string, detail?: unknown): void {
  if (!isChatDebugEnabled()) return
  if (detail !== undefined) {
    console.log(`[Quni chat] ${message}`, detail)
  } else {
    console.log(`[Quni chat] ${message}`)
  }
}
