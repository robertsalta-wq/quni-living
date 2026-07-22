import { createContext } from 'react'
import type { AuthState } from '../hooks/useAuth'

export const AuthContext = createContext<AuthState | null>(null)

/** Safe default while the live AuthProvider chunk loads — must stay loading=true. */
export const AUTH_LOADING_DEFAULT: AuthState = {
  user: null,
  session: null,
  profile: null,
  role: null,
  loading: true,
  awaitingSignInOnboardingRedirect: false,
  clearAwaitingSignInOnboardingRedirect: () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
}
