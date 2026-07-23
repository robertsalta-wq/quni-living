import { Link, useLocation } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { userNeedsEmailAddressVerification } from '../lib/authEmailVerification'
import { getIncompleteOnboardingDestination, needsOnboarding } from '../lib/authProfileRouting'
import { isOnboardingResumeExempt } from '../lib/onboardingResume'
import { SITE_CONTENT_MAX_CLASS } from '../lib/site'

/**
 * Persistent nudge for incomplete renters/landlords browsing outside onboarding.
 * Reappears on every page load (no dismiss).
 */
export function OnboardingResumeBanner() {
  const { user, loading, role, profile } = useAuthContext()
  const location = useLocation()

  if (loading || !user) return null
  if (role === 'admin') return null
  if (isOnboardingResumeExempt(location.pathname)) return null
  if (userNeedsEmailAddressVerification(user)) return null
  if (!needsOnboarding(role, profile, user.id)) return null

  const resumePath = getIncompleteOnboardingDestination(role, profile, user.id)

  return (
    <div
      className="border-b border-amber-200 bg-[var(--quni-cream)] py-3"
      style={{ borderLeftWidth: 4, borderLeftColor: 'var(--quni-coral)' }}
      role="status"
      aria-live="polite"
    >
      <div className={`${SITE_CONTENT_MAX_CLASS} flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4`}>
        <p className="text-sm text-stone-800">
          <span className="font-semibold text-stone-900">Finish setting up your profile</span>
          <span className="text-stone-600"> — complete onboarding to book rooms and use your dashboard.</span>
        </p>
        <Link
          to={resumePath}
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Resume
        </Link>
      </div>
    </div>
  )
}
