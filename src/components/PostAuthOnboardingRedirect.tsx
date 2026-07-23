import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { userNeedsEmailAddressVerification } from '../lib/authEmailVerification'
import { isOnboardingResumeExempt } from '../lib/onboardingResume'
import { consumePostAuthRedirect } from '../lib/postAuthRedirect'

/**
 * One-shot redirect after a real sign-in (SIGNED_IN, not INITIAL_SESSION cold load):
 * incomplete onboarding → onboarding step; otherwise → stored return path or the user's dashboard.
 *
 * Exempt routes (`/login`, `/auth/callback`, …) may own navigation first — but we do **not** clear
 * the one-shot there. If those handlers fail or bounce the user to marketing `/`, this safety net
 * still runs. Flag clears only after we navigate (or admin / verify-email early exits).
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

    // Let Login / AuthCallback try first; keep the flag armed as a fallback.
    if (isOnboardingResumeExempt(location.pathname)) {
      return
    }

    if (role === 'admin') {
      clearAwaitingSignInOnboardingRedirect()
      return
    }

    if (userNeedsEmailAddressVerification(user)) {
      clearAwaitingSignInOnboardingRedirect()
      return
    }

    let cancelled = false
    void import('../lib/authProfileRouting').then(({ resolvePostAuthOneShotDestination }) => {
      if (cancelled) return
      const dest = resolvePostAuthOneShotDestination(user, role, profile, {
        consumeStoredRedirect: consumePostAuthRedirect,
      })
      if (location.pathname !== dest && !location.pathname.startsWith(`${dest}/`)) {
        navigate(dest, { replace: true })
      }
      clearAwaitingSignInOnboardingRedirect()
    })
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
