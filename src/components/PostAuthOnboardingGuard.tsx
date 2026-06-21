import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import type { LandlordProfileRow, StudentProfileRow } from '../lib/authProfile'
import { isLegacyMetadataAdmin } from '../lib/adminEmails'
import { userNeedsEmailAddressVerification } from '../lib/authEmailVerification'
import { landlordNeedsOnboardingWizard } from '../lib/landlordOnboarding'
import { renterOnboardingIncomplete } from '../lib/studentOnboarding'

const GUARD_EXEMPT_PREFIXES = [
  '/onboarding',
  '/auth/callback',
  '/verify-email',
  '/login',
  '/signup',
  '/reset-password',
  '/forgot-password',
  '/admin',
] as const

export function isPostAuthOnboardingGuardExempt(pathname: string): boolean {
  return GUARD_EXEMPT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/**
 * Routes authenticated users with incomplete onboarding to the correct flow from any entry point.
 * Does not consume postAuthRedirect — invite/deep-link return intent is preserved for after onboarding.
 */
export function PostAuthOnboardingGuard({ children }: { children: ReactNode }) {
  const { user, loading, role, profile } = useAuthContext()
  const location = useLocation()

  if (loading || !user) {
    return <>{children}</>
  }

  if (role === 'admin' || isLegacyMetadataAdmin(user)) {
    return <>{children}</>
  }

  if (isPostAuthOnboardingGuardExempt(location.pathname)) {
    return <>{children}</>
  }

  if (userNeedsEmailAddressVerification(user)) {
    return <>{children}</>
  }

  if (!role) {
    return <Navigate to="/onboarding" replace />
  }

  if (role === 'student' && renterOnboardingIncomplete(profile as StudentProfileRow | null, user.id)) {
    return <Navigate to="/onboarding/student" replace />
  }

  if (
    role === 'landlord' &&
    (!profile || landlordNeedsOnboardingWizard(profile as LandlordProfileRow))
  ) {
    return <Navigate to="/onboarding/landlord" replace />
  }

  return <>{children}</>
}
