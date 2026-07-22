import type { ReactNode } from 'react'
import { useProvideAuth } from '../hooks/useAuth'
import { AuthContext } from './authContextShared'

/** Full auth bootstrap — dynamically imported so supabase stays off the marketing critical path. */
export function AuthProviderLive({ children }: { children: ReactNode }) {
  const value = useProvideAuth()
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
