/**
 * Server mirror of src/lib/renterReadiness.ts — keep in sync for booking gates.
 */

function hasDoc(url, submittedAt) {
  return Boolean(
    (typeof url === 'string' ? url.trim() : '') &&
      (typeof submittedAt === 'string' ? submittedAt.trim() : ''),
  )
}

function isNonStudentRoute(route) {
  return route === 'non_student' || route === 'identity'
}

function deriveAccommodationRouteFromSituation(situation) {
  const s = typeof situation === 'string' ? situation.trim() : ''
  if (!s) return null
  return s === 'student' ? 'student' : 'non_student'
}

function effectiveAccommodationRoute(profile) {
  if (profile?.accommodation_verification_route != null) {
    return profile.accommodation_verification_route
  }
  return deriveAccommodationRouteFromSituation(profile?.renter_situation)
}

function hasRenterSituationChosen(profile) {
  return profile?.renter_situation != null
}

function isStudentUniEmailVerified(profile) {
  return Boolean(profile?.uni_email_verified && profile?.uni_email)
}

function isStep1SavedIdentityPath(p) {
  return Boolean(
    p?.first_name?.trim() &&
      p?.last_name?.trim() &&
      p?.gender?.trim() &&
      p?.phone?.trim() &&
      p?.budget_min_per_week != null &&
      p?.budget_max_per_week != null,
  )
}

function isStep1Saved(p) {
  const hasStudy =
    Boolean(p?.study_level?.trim()) || (p?.year_of_study != null && Number(p.year_of_study) >= 1)
  return Boolean(
    p?.first_name?.trim() &&
      p?.last_name?.trim() &&
      p?.university_id &&
      p?.course?.trim() &&
      hasStudy &&
      p?.gender?.trim() &&
      p?.phone?.trim() &&
      p?.budget_min_per_week != null &&
      p?.budget_max_per_week != null,
  )
}

function isStep2Saved(p) {
  return Boolean(p?.emergency_contact_name?.trim() && p?.emergency_contact_phone?.trim())
}

/**
 * @param {import('./renterReadiness.js').RenterReadinessProfileSnapshot | null | undefined} profile
 * @returns {'student' | 'identity' | 'none'}
 */
export function computeVerificationTierEligible(profile) {
  if (!profile) return 'none'
  const route = effectiveAccommodationRoute(profile)
  if (!route) return 'none'

  const idOk = hasDoc(profile.id_document_url, profile.id_submitted_at)

  if (!isNonStudentRoute(route)) {
    if (!isStudentUniEmailVerified(profile) || !idOk) return 'none'
    if (!hasDoc(profile.enrolment_doc_url, profile.enrolment_submitted_at)) return 'none'
    return 'student'
  }

  if (!idOk) return 'none'
  if (!hasDoc(profile.identity_supporting_doc_url, profile.identity_supporting_submitted_at)) {
    return 'none'
  }
  return 'identity'
}

/**
 * @param {import('./renterReadiness.js').RenterReadinessProfileSnapshot | null | undefined} profile
 * @returns {'student' | 'identity' | 'none'}
 */
export function effectiveVerificationTier(profile) {
  if (!profile) return 'none'
  const stored = profile.verification_type
  if (stored === 'student' || stored === 'identity') return stored
  return computeVerificationTierEligible(profile)
}

/**
 * @param {import('./renterReadiness.js').RenterReadinessProfileSnapshot | null | undefined} profile
 */
export function computeRenterReadiness(profile) {
  if (!profile) {
    return {
      profileSetupComplete: false,
      canRequestBooking: false,
      effectiveVerificationTier: 'none',
      blocksBooking: ['Complete your profile'],
    }
  }

  const situationChosen = hasRenterSituationChosen(profile)
  const route = effectiveAccommodationRoute(profile)
  const personal = route
    ? isNonStudentRoute(route)
      ? isStep1SavedIdentityPath(profile)
      : isStep1Saved(profile)
    : false
  const terms = Boolean(profile.terms_accepted_at)
  const emergency = isStep2Saved(profile)
  const studentRoute = situationChosen && route != null && !isNonStudentRoute(route)
  const uniEmailOk = !studentRoute || isStudentUniEmailVerified(profile)
  const effectiveTier = effectiveVerificationTier(profile)
  const verification = effectiveTier !== 'none'

  const profileSetupComplete =
    situationChosen && route != null && personal && terms && emergency && uniEmailOk

  const blocksBooking = []
  if (!situationChosen) blocksBooking.push('Choose your situation')
  if (!personal) blocksBooking.push('Complete personal details')
  if (!terms) blocksBooking.push('Accept Terms of Service')
  if (!emergency) blocksBooking.push('Add emergency contact')
  if (studentRoute && !uniEmailOk) blocksBooking.push('Verify university email')
  if (profileSetupComplete && !verification) {
    if (studentRoute) {
      blocksBooking.push('Complete student verification (ID and enrolment)')
    } else {
      blocksBooking.push('Complete identity verification (photo ID and supporting document)')
    }
  }

  return {
    profileSetupComplete,
    canRequestBooking: profileSetupComplete && verification,
    effectiveVerificationTier: effectiveTier,
    blocksBooking,
  }
}
