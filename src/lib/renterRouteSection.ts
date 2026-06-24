import { hasSavedWorkplaceCoordinates } from './workplaceLocation'
import type { RenterSituation } from './renterSituation'
import type { StudentProfileRow } from './studentOnboarding'

function hasDoc(url: string | null | undefined, submittedAt: string | null | undefined): boolean {
  return Boolean(url?.trim() && submittedAt?.trim())
}

export function isStudentRouteSectionComplete(profile: StudentProfileRow): boolean {
  const hasStudy =
    Boolean(profile.study_level?.trim()) || (profile.year_of_study != null && Number(profile.year_of_study) >= 1)
  return Boolean(
    profile.university_id &&
      profile.course?.trim() &&
      hasStudy &&
      profile.income_band?.trim() &&
      hasDoc(profile.enrolment_doc_url, profile.enrolment_submitted_at),
  )
}

export function isWorkingRouteSectionComplete(profile: StudentProfileRow): boolean {
  return Boolean(
    profile.employment_status?.trim() &&
      profile.employer_name?.trim() &&
      profile.job_title?.trim() &&
      profile.employment_type?.trim() &&
      profile.income_band?.trim() &&
      hasSavedWorkplaceCoordinates(profile),
  )
}

export function isVisaRouteSectionComplete(profile: StudentProfileRow): boolean {
  return Boolean(
    profile.visa_status?.trim() &&
      profile.visa_subclass?.trim() &&
      profile.visa_expiry &&
      profile.income_band?.trim() &&
      hasDoc(profile.visa_doc_url, profile.visa_submitted_at),
  )
}

export function isGeneralRouteSectionComplete(profile: StudentProfileRow): boolean {
  return Boolean(profile.income_band?.trim() && profile.income_source?.trim())
}

export function isRouteSectionComplete(
  situation: RenterSituation | null | undefined,
  profile: StudentProfileRow,
): boolean {
  if (!situation) return false
  switch (situation) {
    case 'student':
      return isStudentRouteSectionComplete(profile)
    case 'working':
      return isWorkingRouteSectionComplete(profile)
    case 'working_holiday':
    case 'backpacker':
      return isVisaRouteSectionComplete(profile)
    case 'retired':
    case 'between_jobs':
      return isGeneralRouteSectionComplete(profile)
    default:
      return false
  }
}

/** True when switching situation would discard saved route-section fields. */
export function routeSectionHasData(
  situation: RenterSituation | null | undefined,
  profile: StudentProfileRow,
): boolean {
  if (!situation) return false
  switch (situation) {
    case 'student':
      return Boolean(
        profile.university_id ||
          profile.course?.trim() ||
          profile.campus_id ||
          profile.study_level?.trim() ||
          profile.year_of_study != null ||
          profile.income_band?.trim() ||
          hasDoc(profile.enrolment_doc_url, profile.enrolment_submitted_at),
      )
    case 'working':
      return Boolean(
        profile.employment_status?.trim() ||
          profile.employer_name?.trim() ||
          profile.job_title?.trim() ||
          profile.employment_type?.trim() ||
          profile.income_band?.trim() ||
          profile.workplace_suburb?.trim() ||
          profile.workplace_latitude != null,
      )
    case 'working_holiday':
    case 'backpacker':
      return Boolean(
        profile.visa_status?.trim() ||
          profile.visa_subclass?.trim() ||
          profile.visa_expiry ||
          profile.income_band?.trim() ||
          hasDoc(profile.visa_doc_url, profile.visa_submitted_at),
      )
    case 'retired':
    case 'between_jobs':
      return Boolean(profile.income_band?.trim() || profile.income_source?.trim())
    default:
      return false
  }
}

const routeIncomeClearPatch = {
  income_band: null,
  income_source: null,
} as const

/** Clears route-section fields when renter changes situation (after confirm). */
export function routeSectionClearPatch(situation: RenterSituation): Record<string, unknown> {
  switch (situation) {
    case 'student':
      return {
        university_id: null,
        campus_id: null,
        course: null,
        study_level: null,
        year_of_study: null,
        enrolment_doc_url: null,
        enrolment_submitted_at: null,
        enrolment_doc_name: null,
        ...routeIncomeClearPatch,
      }
    case 'working':
      return {
        employment_status: null,
        employer_name: null,
        job_title: null,
        employment_type: null,
        workplace_label: null,
        workplace_address: null,
        workplace_suburb: null,
        workplace_state: null,
        workplace_postcode: null,
        workplace_latitude: null,
        workplace_longitude: null,
        workplace_geocoded_at: null,
        ...routeIncomeClearPatch,
      }
    case 'working_holiday':
    case 'backpacker':
      return {
        visa_status: null,
        visa_subclass: null,
        visa_expiry: null,
        visa_doc_url: null,
        visa_submitted_at: null,
        visa_doc_name: null,
        visa_doc_verified_at: null,
        visa_doc_review_status: null,
        ...routeIncomeClearPatch,
      }
    case 'retired':
    case 'between_jobs':
      return { ...routeIncomeClearPatch }
    default:
      return {}
  }
}
