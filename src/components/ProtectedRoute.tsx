import { Navigate, useLocation } from 'react-router-dom'
import PageRouteFallback from './PageRouteFallback'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuthContext } from '../context/AuthContext'
import { isRenterRole, type StudentProfileRow, type UserRole } from '../lib/authProfile'
import { isStudentListingActionsUnlocked } from '../lib/onboardingChecklist'
import { INCOMPLETE_RENTER_DESTINATION } from '../lib/authProfile'
import { isLegacyMetadataAdmin } from '../lib/adminEmails'
import { userNeedsEmailAddressVerification } from '../lib/authEmailVerification'

type AllowedRole = Exclude<UserRole, null>

function roleSatisfiesAllowed(role: AllowedRole, allowed: AllowedRole): boolean {
  return role === allowed
}

function isRoleAllowed(role: AllowedRole, allowedRoles: AllowedRole[]): boolean {
  return allowedRoles.some((allowed) => roleSatisfiesAllowed(role, allowed))
}

type Props = {
  children: React.ReactNode
  /** If set, user must have this resolved role or they are sent to `/`. */
  allowedRoles?: AllowedRole[]
  /** When unauthenticated, send to `/signup?role=renter&redirect=…` instead of login. */
  redirectUnauthenticatedToStudentSignup?: boolean
  /** Student routes: require core profile (university, course, phone, budget) before access. */
  requireStudentListingActions?: boolean
}

/**
 * Requires Supabase session + a profile row (student or landlord), except admins (no profile).
 */
export function ProtectedRoute({
  children,
  allowedRoles,
  redirectUnauthenticatedToStudentSignup,
  requireStudentListingActions,
}: Props) {
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
    return <PageRouteFallback />
  }

  if (!user) {
    if (redirectUnauthenticatedToStudentSignup) {
      const next = encodeURIComponent(`${location.pathname}${location.search}`)
      return <Navigate to={`/signup?role=renter&redirect=${next}`} replace />
    }
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (role !== 'admin' && !isLegacyMetadataAdmin(user) && userNeedsEmailAddressVerification(user)) {
    return <Navigate to="/verify-email" replace state={{ from: location }} />
  }

  if (role === 'admin') {
    if (allowedRoles?.length && !allowedRoles.includes('admin')) {
      return <Navigate to="/" replace />
    }
    return <>{children}</>
  }

  if (!role || profile === null) {
    return <Navigate to="/onboarding" replace />
  }

  if (allowedRoles?.length && !isRoleAllowed(role, allowedRoles)) {
    return <Navigate to="/" replace />
  }

  if (requireStudentListingActions && isRenterRole(role) && profile) {
    const sp = profile as StudentProfileRow
    const path = location.pathname
    if (
      !isStudentListingActionsUnlocked(sp) &&
      !path.startsWith(INCOMPLETE_RENTER_DESTINATION) &&
      !path.startsWith('/onboarding/student')
    ) {
      return <Navigate to={INCOMPLETE_RENTER_DESTINATION} replace state={{ from: location }} />
    }
  }

  return <>{children}</>
}

/** Logged-in only (profile optional) - e.g. onboarding */
export function RequireUser({ children }: { children: React.ReactNode }) {
  const { user, loading, role } = useAuthContext()
  const location = useLocation()

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-lg mx-auto px-6 py-12 text-center text-gray-600 text-sm">
        Configure Supabase in <code className="bg-gray-100 px-1 rounded">.env.local</code>.
      </div>
    )
  }

  if (loading) {
    return <PageRouteFallback />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (role !== 'admin' && !isLegacyMetadataAdmin(user) && userNeedsEmailAddressVerification(user)) {
    return <Navigate to="/verify-email" replace state={{ from: location }} />
  }

  return <>{children}</>
}
