import { Navigate, useLocation } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import type { UserRole } from '../lib/authProfile'

type AllowedRole = Exclude<UserRole, null>

type Props = {
  children: React.ReactNode
  /** If set, user must have this resolved role or they are sent to `/`. */
  allowedRoles?: AllowedRole[]
}

/**
 * Requires Supabase session + a profile row (student or landlord), except admins (no profile).
 */
export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, loading, profile, role } = useAuthContext()
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

  if (role === 'admin') {
    if (allowedRoles?.length && !allowedRoles.includes('admin')) {
      return <Navigate to="/" replace />
    }
    return <>{children}</>
  }

  if (!user.user_metadata?.role || profile === null) {
    return <Navigate to="/onboarding" replace />
  }

  if (allowedRoles?.length && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/" replace />
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
