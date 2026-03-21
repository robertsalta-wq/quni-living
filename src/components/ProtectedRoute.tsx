import { Navigate, useLocation } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'

type Props = { children: React.ReactNode }

/**
 * Requires Supabase session + a profile row (student or landlord).
 */
export function ProtectedRoute({ children }: Props) {
  const { user, loading, profile } = useAuthContext()
  const location = useLocation()

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12 text-center text-gray-600 text-sm">
        Add <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
        <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to{' '}
        <code className="bg-gray-100 px-1 rounded">.env.local</code>.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!user.user_metadata?.role || profile === null) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

/** Logged-in only (profile optional) — e.g. onboarding */
export function RequireUser({ children }: Props) {
  const { user, loading } = useAuthContext()
  const location = useLocation()

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12 text-center text-gray-600 text-sm">
        Configure Supabase in <code className="bg-gray-100 px-1 rounded">.env.local</code>.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
