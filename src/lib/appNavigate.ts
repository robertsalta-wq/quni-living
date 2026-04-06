import type { NavigateFunction } from 'react-router-dom'

let navigateRef: NavigateFunction | null = null

type Pending = { to: string; replace?: boolean }
const pending: Pending[] = []

function flushPending() {
  const nav = navigateRef
  if (!nav) return
  while (pending.length) {
    const p = pending.shift()!
    nav(p.to, { replace: p.replace ?? false })
  }
}

/**
 * Called from inside `<BrowserRouter>` so native OAuth (and similar) can route without
 * `window.location`, which breaks Capacitor’s static server (no `/auth/callback` file → white screen).
 */
export function registerAppNavigate(navigate: NavigateFunction): void {
  navigateRef = navigate
  flushPending()
}

/** In-app navigation when the router is mounted; queues until then. */
export function appNavigateTo(to: string, options?: { replace?: boolean }): void {
  if (navigateRef) {
    navigateRef(to, { replace: options?.replace ?? false })
    return
  }
  pending.push({ to, replace: options?.replace })
}
