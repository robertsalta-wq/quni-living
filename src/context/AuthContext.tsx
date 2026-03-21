import { createContext, useContext, type ReactNode } from 'react'
import { useProvideAuth, type AuthState } from '../hooks/useAuth'

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useProvideAuth()
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* Hook lives next to provider — consumers import from here */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return ctx
}
