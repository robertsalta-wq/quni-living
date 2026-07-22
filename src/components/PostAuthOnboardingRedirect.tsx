import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { isLegacyMetadataAdmin } from '../lib/adminEmails'
import { userNeedsEmailAddressVerification } from '../lib/authEmailVerification'
import { isOnboardingResumeExempt } from '../lib/onboardingResume'

/**
 * One-shot redirect after a real sign-in (SIGNED_IN, not INITIAL_SESSION cold load).
 * Auth callback and other exempt routes own their own navigation — no double redirect.
 */
export function PostAuthOnboardingRedirect() {
  const {
    user,
    loading,
    role,
    profile,
    awaitingSignInOnboardingRedirect,
    clearAwaitingSignInOnboardingRedirect,
  } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!awaitingSignInOnboardingRedirect || loading || !user) return

    if (isOnboardingResumeExempt(location.pathname)) {
      clearAwaitingSignInOnboardingRedirect()
      return
    }

    if (role === 'admin' || isLegacyMetadataAdmin(user)) {
      clearAwaitingSignInOnboardingRedirect()
      return
    }

    if (userNeedsEmailAddressVerification(user)) {
      clearAwaitingSignInOnboardingRedirect()
      return
    }

    let cancelled = false
    void import('../lib/authProfileRouting').then(
      ({ getIncompleteOnboardingDestination, needsOnboarding }) => {
        if (cancelled) return
        if (!needsOnboarding(role, profile, user.id)) {
          clearAwaitingSignInOnboardingRedirect()
          return
        }

        const dest = getIncompleteOnboardingDestination(role, profile, user.id)
        if (location.pathname !== dest && !location.pathname.startsWith(`${dest}/`)) {
          navigate(dest, { replace: true })
        }
        clearAwaitingSignInOnboardingRedirect()
      },
    )
    return () => {
      cancelled = true
    }
  }, [
    awaitingSignInOnboardingRedirect,
    clearAwaitingSignInOnboardingRedirect,
    loading,
    location.pathname,
    navigate,
    profile,
    role,
    user,
  ])

  return null
}
