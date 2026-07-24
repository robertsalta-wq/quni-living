import { Link, useLocation } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { userNeedsEmailAddressVerification } from '../lib/authEmailVerification'
import {
  getIncompleteOnboardingDestination,
  needsOnboarding,
  type AuthProfile,
  type UserRole,
} from '../lib/authProfileRouting'
import { isRenterRole } from '../lib/marketplaceRole'
import {
  computeLandlordReadiness,
  landlordIncompleteSubtitle,
} from '../lib/landlordProfileReadiness'
import { isOnboardingResumeExempt, isOnboardingResumeDashboardPath } from '../lib/onboardingResume'
import { computeRenterReadiness } from '../lib/renterReadiness'
import type { Database } from '../lib/database.types'
import {
  PROFILE_INCOMPLETE_NUDGE_CARD_CLASS,
  ProfileIncompleteNudge,
  ProfileIncompleteNudgeArrow,
} from './profile'

type StudentProfileRow = Database['public']['Tables']['student_profiles']['Row']
type LandlordProfileRow = Database['public']['Tables']['landlord_profiles']['Row']

/** Inner row: dashboard column width + horizontal gutters only (no dashboard vertical pad). */
const BANNER_CONTENT_TRACK_CLASS =
  'max-w-site mx-auto w-full min-w-0 px-3.5 sm:px-4 lg:px-8'

function resumeSubtitle(role: UserRole, profile: AuthProfile | null): string {
  if (isRenterRole(role)) {
    const readiness = computeRenterReadiness(profile as StudentProfileRow | null)
    return readiness.blocksBooking[0] ?? 'Complete required sections'
  }
  if (role === 'landlord' && profile) {
    return landlordIncompleteSubtitle(computeLandlordReadiness(profile as LandlordProfileRow))
  }
  return 'Complete required sections'
}

/**
 * Persistent nudge for incomplete renters/landlords browsing outside onboarding.
 * Same visual language as ProfileReadinessDriver collapsed incomplete.
 * Hidden on dashboards that already surface a profile nudge.
 * Reappears on every page load (no dismiss).
 */
export function OnboardingResumeBanner() {
  const { user, loading, role, profile } = useAuthContext()
  const location = useLocation()

  if (loading || !user) return null
  if (role === 'admin') return null
  if (isOnboardingResumeExempt(location.pathname)) return null
  if (isOnboardingResumeDashboardPath(location.pathname)) return null
  if (userNeedsEmailAddressVerification(user)) return null
  if (!needsOnboarding(role, profile, user.id)) return null

  const resumePath = getIncompleteOnboardingDestination(role, profile, user.id)
  const resumeUrl = new URL(resumePath, 'http://local')
  const onResumeDestination =
    location.pathname === resumeUrl.pathname &&
    (resumeUrl.searchParams.get('tab') !== 'profile' ||
      new URLSearchParams(location.search).get('tab') === 'profile')
  if (onResumeDestination) return null

  const subtitle = resumeSubtitle(role, profile)

  return (
    <div className="border-b border-admin-line bg-admin-surface-2 py-3" role="status" aria-live="polite">
      <div className={BANNER_CONTENT_TRACK_CLASS}>
        <Link
          to={resumePath}
          className={`${PROFILE_INCOMPLETE_NUDGE_CARD_CLASS} block px-[22px] py-3.5 no-underline transition-opacity hover:opacity-95`}
        >
          <ProfileIncompleteNudge subtitle={subtitle} trailing={<ProfileIncompleteNudgeArrow />} />
        </Link>
      </div>
    </div>
  )
}
