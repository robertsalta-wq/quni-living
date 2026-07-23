import { useContext, useEffect, useState, type ComponentType, type ReactNode } from 'react'
import type { AuthState } from '../hooks/useAuth'
import { shouldBootstrapAuthEagerly } from '../lib/shouldBootstrapAuthEagerly'
import { AUTH_GUEST_DEFAULT, AUTH_LOADING_DEFAULT, AuthContext } from './authContextShared'

type LiveProvider = ComponentType<{ children: ReactNode }>

function scheduleAuthBootstrap(start: () => void): () => void {
  if (typeof window === 'undefined') {
    // SSR / prerender: keep loading shell (no session on server).
    return () => {}
  }
  if (shouldBootstrapAuthEagerly()) {
    start()
    return () => {}
  }
  const ric = window.requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => number)
    | undefined
  if (typeof ric === 'function') {
    const id = ric(start, { timeout: 2500 })
    return () => window.cancelIdleCallback(id)
  }
  const t = window.setTimeout(start, 1)
  return () => window.clearTimeout(t)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [Live, setLive] = useState<LiveProvider | null>(null)
  const isServer = typeof window === 'undefined'

  useEffect(() => {
    if (isServer) return
    let cancelled = false
    return scheduleAuthBootstrap(() => {
      void import('./AuthProviderLive').then((m) => {
        if (!cancelled) setLive(() => m.AuthProviderLive)
      })
    })
  }, [isServer])

  if (isServer) {
    return <AuthContext.Provider value={AUTH_GUEST_DEFAULT}>{children}</AuthContext.Provider>
  }
  if (!Live) {
    return <AuthContext.Provider value={AUTH_LOADING_DEFAULT}>{children}</AuthContext.Provider>
  }
  return <Live>{children}</Live>
}

/* Hook lives next to provider - consumers import from here */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return ctx
}
