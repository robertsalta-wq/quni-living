import { Link, useLocation } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { userNeedsEmailAddressVerification } from '../lib/authEmailVerification'
import { getIncompleteOnboardingDestination, needsOnboarding } from '../lib/authProfileRouting'
import { dashboardPrimaryBtnClass } from '../lib/dashboardButtons'
import { isOnboardingResumeExempt } from '../lib/onboardingResume'

/** Inner row: dashboard column width + horizontal gutters only (no dashboard vertical pad). */
const BANNER_CONTENT_TRACK_CLASS =
  'max-w-site mx-auto w-full min-w-0 px-3.5 sm:px-4 lg:px-8'

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
  const resumeUrl = new URL(resumePath, 'http://local')
  const onResumeDestination =
    location.pathname === resumeUrl.pathname &&
    (resumeUrl.searchParams.get('tab') !== 'profile' ||
      new URLSearchParams(location.search).get('tab') === 'profile')
  if (onResumeDestination) return null

  return (
    <div
      className="border-b border-amber-200 bg-[var(--quni-cream)] py-3"
      style={{ borderLeftWidth: 4, borderLeftColor: 'var(--quni-coral)' }}
      role="status"
      aria-live="polite"
    >
      <div className={`${BANNER_CONTENT_TRACK_CLASS} flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4`}>
        <p className="text-sm text-stone-800">
          <span className="font-semibold text-stone-900">Finish setting up your profile</span>
          <span className="text-stone-600"> — complete onboarding to book rooms and use your dashboard.</span>
        </p>
        <Link to={resumePath} className={`${dashboardPrimaryBtnClass} shrink-0`}>
          Resume
        </Link>
      </div>
    </div>
  )
}
