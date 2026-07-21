import { Link, useLocation } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { isLegacyMetadataAdmin } from '../lib/adminEmails'
import { userNeedsEmailAddressVerification } from '../lib/authEmailVerification'
import { getIncompleteOnboardingDestination, needsOnboarding } from '../lib/authProfile'
import { isOnboardingResumeExempt } from '../lib/onboardingResume'

/**
 * Persistent nudge for incomplete renters/landlords browsing outside onboarding.
 * Reappears on every page load (no dismiss).
 */
export function OnboardingResumeBanner() {
  const { user, loading, role, profile } = useAuthContext()
  const location = useLocation()

  if (loading || !user) return null
  if (role === 'admin' || isLegacyMetadataAdmin(user)) return null
  if (isOnboardingResumeExempt(location.pathname)) return null
  if (userNeedsEmailAddressVerification(user)) return null
  if (!needsOnboarding(role, profile, user.id)) return null

  const resumePath = getIncompleteOnboardingDestination(role, profile, user.id)

  return (
    <div
      className="border-b border-amber-200 bg-[var(--quni-cream)] px-4 py-3 sm:px-6"
      style={{ borderLeftWidth: 4, borderLeftColor: 'var(--quni-coral)' }}
      role="status"
      aria-live="polite"
    >
      <div className="max-w-site mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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
