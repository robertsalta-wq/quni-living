import type { Database } from './database.types'
import { INCOMPLETE_RENTER_DESTINATION } from './authProfile'
import { isStudentUniEmailVerified } from './studentUniEmailVerification'
import {
  effectiveAccommodationRoute,
  hasRenterSituationChosen,
  type RenterSituation,
} from './renterSituation'
import { isPersonalDetailsComplete } from './renterProfileSection'
import { isRouteSectionComplete } from './renterRouteSection'
import { incomeBandSuggestsGuarantor } from './renterIncomeBands'
import { renterProfilePath } from './renterProfilePaths'
import {
  docFromProfile,
  docStepComplete,
  type VerificationUploadedDoc,
} from './verificationDocSlot'
import {
  isNonStudentAccommodationRoute,
  isStep2Saved,
  type StudentProfileRow,
} from './studentOnboarding'

export type { StudentProfileRow }

export type VerificationTier = 'student' | 'identity' | 'none'

export type RenterReadinessSections = {
  situationRoute: boolean
  personal: boolean
  terms: boolean
  emergency: boolean
  verification: boolean
}

export type RenterReadiness = {
  route: StudentProfileRow['accommodation_verification_route']
  sections: RenterReadinessSections
  /** Human labels for pinned driver / booking CTA — same source as API block reasons. */
  blocksBooking: string[]
  profileSetupComplete: boolean
  canRequestBooking: boolean
  canBrowseListings: boolean
  /** Tier from live field presence (promotion target). */
  verificationTierEligible: VerificationTier
  /** Tier used for booking gates — promoted column or live eligibility. */
  effectiveVerificationTier: VerificationTier
}

function hasDoc(url: string | null | undefined, submittedAt: string | null | undefined): boolean {
  return Boolean(url?.trim() && submittedAt?.trim())
}

/** Live field-presence tier — does not read `verification_type`. */
export function computeVerificationTierEligible(
  profile: StudentProfileRow | null | undefined,
): VerificationTier {
  if (!profile) return 'none'
  const route = effectiveAccommodationRoute(profile)
  if (!route) return 'none'

  const idOk = hasDoc(profile.id_document_url, profile.id_submitted_at)

  if (!isNonStudentAccommodationRoute(route)) {
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

/** Booking gate tier: trust promoted column when set, else live eligibility. */
export function effectiveVerificationTier(
  profile: StudentProfileRow | null | undefined,
): VerificationTier {
  if (!profile) return 'none'
  const stored = profile.verification_type
  if (stored === 'student' || stored === 'identity') return stored
  return computeVerificationTierEligible(profile)
}

export function tierToPromote(
  profile: StudentProfileRow | null | undefined,
): 'student' | 'identity' | null {
  if (!profile || profile.verification_type !== 'none') return null
  const eligible = computeVerificationTierEligible(profile)
  return eligible === 'none' ? null : eligible
}

/** Target verification_type from live eligibility, or null if already aligned (promote or demote). */
export function tierToSync(profile: StudentProfileRow | null | undefined): VerificationTier | null {
  if (!profile) return null
  const target = computeVerificationTierEligible(profile)
  return profile.verification_type === target ? null : target
}

/** Personal section (§01): name, phone, gender per design handoff. */
function personalComplete(profile: StudentProfileRow): boolean {
  return isPersonalDetailsComplete(profile)
}

function studentRouteEmailComplete(profile: StudentProfileRow, route: ReturnType<typeof effectiveAccommodationRoute>): boolean {
  if (!route || isNonStudentAccommodationRoute(route)) return true
  return isStudentUniEmailVerified(profile)
}

export function computeRenterReadiness(
  profile: StudentProfileRow | null | undefined,
): RenterReadiness {
  if (!profile) {
    return {
      route: null,
      sections: {
        situationRoute: false,
        personal: false,
        terms: false,
        emergency: false,
        verification: false,
      },
      blocksBooking: ['Complete your profile'],
      profileSetupComplete: false,
      canRequestBooking: false,
      canBrowseListings: false,
      verificationTierEligible: 'none',
      effectiveVerificationTier: 'none',
    }
  }

  const situationChosen = hasRenterSituationChosen(profile)
  const route = effectiveAccommodationRoute(profile)
  const personal = route ? personalComplete(profile) : false
  const terms = Boolean(profile.terms_accepted_at)
  const emergency = isStep2Saved(profile)
  const verificationTierEligible = computeVerificationTierEligible(profile)
  const effectiveTier = effectiveVerificationTier(profile)
  const verification = effectiveTier !== 'none'

  const studentRoute = situationChosen && route != null && !isNonStudentAccommodationRoute(route)
  const uniEmailOk = studentRouteEmailComplete(profile, route)

  const profileSetupComplete =
    situationChosen && route != null && personal && terms && emergency && uniEmailOk

  const blocksBooking: string[] = []
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

  const canRequestBooking = profileSetupComplete && verification
  const canBrowseListings = Boolean(profile.user_id)

  return {
    route,
    sections: {
      situationRoute: situationChosen,
      personal,
      terms,
      emergency,
      verification,
    },
    blocksBooking,
    profileSetupComplete,
    canRequestBooking,
    canBrowseListings,
    verificationTierEligible,
    effectiveVerificationTier: effectiveTier,
  }
}

/** Post-auth / wizard routing — field state only; never reads `onboarding_complete`. */
export function renterProfileSetupIncomplete(
  profile: StudentProfileRow | null | undefined,
): boolean {
  return !computeRenterReadiness(profile).profileSetupComplete
}

/** Post-auth / wizard routing — field state only; never reads `onboarding_complete`. */
export function renterOnboardingIncomplete(
  profile: StudentProfileRow | null | undefined,
  _userId?: string | null,
): boolean {
  return renterProfileSetupIncomplete(profile)
}

export function needsStudentDetailedOnboarding(
  profile: StudentProfileRow | null | undefined,
  _userId?: string | null,
): boolean {
  if (!profile) return false
  return renterOnboardingIncomplete(profile)
}

export function isGuarantorSectionComplete(profile: StudentProfileRow): boolean {
  if (profile.has_guarantor === false) return true
  return Boolean(
    profile.guarantor_name?.trim() &&
      profile.guarantor_relationship?.trim() &&
      profile.guarantor_phone?.trim() &&
      profile.guarantor_email?.trim() &&
      profile.guarantor_income_band?.trim() &&
      profile.guarantor_consent === true,
  )
}

function renterRouteFlowNeedsGuarantor(
  profile: StudentProfileRow,
  situation: RenterSituation | null,
): boolean {
  if (!situation) return false
  if (profile.has_guarantor === true) return true
  if (situation === 'student' || situation === 'working_holiday' || situation === 'backpacker') return false
  if (situation === 'working') {
    return !profile.income_band?.trim() || incomeBandSuggestsGuarantor(profile.income_band)
  }
  return incomeBandSuggestsGuarantor(profile.income_band)
}

export function isRenterRouteFlowComplete(
  profile: StudentProfileRow,
  situation: RenterSituation | null,
): boolean {
  if (!situation || !isRouteSectionComplete(situation, profile)) return false
  const needsGuarantor = renterRouteFlowNeedsGuarantor(profile, situation)
  return !needsGuarantor || isGuarantorSectionComplete(profile)
}

/** Profile-page driver and dashboard stat card — same 4-section fraction. */
export function computeRenterProfileDriverProgress(
  profile: StudentProfileRow,
  situation: RenterSituation | null,
  verificationComplete: boolean,
): { done: number; total: number; pct: number } {
  const total = 4
  if (!situation) {
    return { done: 0, total, pct: 0 }
  }
  let done = 0
  if (isPersonalDetailsComplete(profile)) done += 1
  if (verificationComplete) done += 1
  if (isRenterRouteFlowComplete(profile, situation)) done += 1
  if (isStep2Saved(profile)) done += 1
  const pct = Math.round((done / total) * 100)
  return { done, total, pct }
}

export function isRenterUniversalVerificationComplete(
  profile: StudentProfileRow,
  situation: RenterSituation,
  docs?: {
    idDoc?: VerificationUploadedDoc | null
    identitySupportDoc?: VerificationUploadedDoc | null
  },
): boolean {
  const idDoc =
    docs?.idDoc ??
    docFromProfile(profile.id_document_url, profile.id_submitted_at, profile.id_document_name)
  const identitySupportDoc =
    docs?.identitySupportDoc ??
    docFromProfile(
      profile.identity_supporting_doc_url,
      profile.identity_supporting_submitted_at,
      profile.identity_supporting_doc_name,
    )
  const idOk = docStepComplete(idDoc)
  const supportOk = docStepComplete(identitySupportDoc)
  if (!idOk || !supportOk) return false
  if (situation === 'student') return isStudentUniEmailVerified(profile)
  if (situation === 'working') return Boolean(profile.work_email_verified && profile.work_email)
  return true
}

export function renterProfileStatCardCopy(
  profile: StudentProfileRow,
  verificationComplete: boolean,
): {
  done: number
  total: number
  pct: number
  complete: boolean
  showFinishSetup: boolean
} {
  const situation = profile.renter_situation ?? null
  const { done, total, pct } = computeRenterProfileDriverProgress(profile, situation, verificationComplete)
  const complete = done === total && total > 0
  return {
    done,
    total,
    pct,
    complete,
    showFinishSetup: !complete,
  }
}

export function renterReadinessActionHref(readiness: RenterReadiness): string {
  if (!readiness.sections.situationRoute || !readiness.sections.personal || !readiness.sections.terms) {
    return INCOMPLETE_RENTER_DESTINATION
  }
  if (!readiness.sections.emergency) return INCOMPLETE_RENTER_DESTINATION
  if (!readiness.sections.verification) return renterProfilePath('verification')
  return INCOMPLETE_RENTER_DESTINATION
}

export type RenterChecklistStep = {
  id: string
  label: string
  complete: boolean
  href?: string
  actionLabel?: string
  optional?: boolean
}

export function buildRenterReadinessChecklistSteps(
  profile: StudentProfileRow | null | undefined,
): RenterChecklistStep[] {
  const readiness = computeRenterReadiness(profile)
  const p = profile ?? null
  const route = p ? effectiveAccommodationRoute(p) : null
  const studentRoute = route != null && !isNonStudentAccommodationRoute(route)
  const photoOk = Boolean(p?.avatar_url?.trim())

  const steps: RenterChecklistStep[] = [
    { id: 'account', label: 'Account created', complete: true },
  ]

  if (p && !readiness.sections.situationRoute) {
    steps.push({
      id: 'situation',
      label: 'Choose your situation',
      complete: false,
      href: INCOMPLETE_RENTER_DESTINATION,
      actionLabel: 'Choose →',
    })
  }

  if (studentRoute) {
    steps.push({
      id: 'uni_email',
      label: 'Verify your university email',
      complete: readiness.sections.situationRoute && isStudentUniEmailVerified(p),
      href: renterProfilePath('verification'),
      actionLabel: 'Verify →',
    })
    if (readiness.sections.situationRoute) {
      steps.push({
        id: 'student_verify',
        label: 'Complete student verification (ID and enrolment)',
        complete: readiness.sections.verification,
        href: renterProfilePath('verification'),
        actionLabel: 'Verify →',
      })
    }
  } else if (route != null && isNonStudentAccommodationRoute(route)) {
    steps.push({
      id: 'identity_verify',
      label: 'Verify your identity (photo ID + supporting document)',
      complete: readiness.sections.verification,
      href: renterProfilePath('verification'),
      actionLabel: 'Verify →',
    })
  }

  steps.push(
    {
      id: 'terms',
      label: 'Accept Terms of Service and Privacy Policy',
      complete: readiness.sections.terms,
      href: INCOMPLETE_RENTER_DESTINATION,
      actionLabel: 'Accept →',
    },
    {
      id: 'profile',
      label: 'Complete your profile',
      complete: readiness.sections.personal && readiness.sections.emergency,
      href: INCOMPLETE_RENTER_DESTINATION,
      actionLabel: 'Complete →',
    },
    {
      id: 'photo',
      label: 'Add profile photo',
      complete: photoOk,
      optional: true,
      href: INCOMPLETE_RENTER_DESTINATION,
      actionLabel: 'Add →',
    },
  )

  return steps
}

export function renterChecklistFraction(steps: RenterChecklistStep[]): {
  done: number
  total: number
  pct: number
} {
  const total = steps.length
  const done = steps.filter((s) => s.complete).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return { done, total, pct }
}

export function isRenterChecklistFullyComplete(steps: RenterChecklistStep[]): boolean {
  return steps.every((s) => s.complete)
}

/** Minimal profile shape for API booking eligibility (live tier computation). */
export type RenterReadinessProfileSnapshot = Pick<
  Database['public']['Tables']['student_profiles']['Row'],
  | 'renter_situation'
  | 'accommodation_verification_route'
  | 'verification_type'
  | 'terms_accepted_at'
  | 'first_name'
  | 'last_name'
  | 'gender'
  | 'phone'
  | 'budget_min_per_week'
  | 'budget_max_per_week'
  | 'university_id'
  | 'course'
  | 'study_level'
  | 'year_of_study'
  | 'emergency_contact_name'
  | 'emergency_contact_phone'
  | 'uni_email'
  | 'uni_email_verified'
  | 'id_document_url'
  | 'id_submitted_at'
  | 'enrolment_doc_url'
  | 'enrolment_submitted_at'
  | 'identity_supporting_doc_url'
  | 'identity_supporting_submitted_at'
>
