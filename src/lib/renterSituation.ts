import type { Database } from './database.types'

export type RenterSituation = NonNullable<
  Database['public']['Tables']['student_profiles']['Row']['renter_situation']
>

export const RENTER_SITUATION_VALUES = [
  'student',
  'working',
  'working_holiday',
  'backpacker',
  'retired',
  'between_jobs',
] as const satisfies readonly RenterSituation[]

export const RENTER_SITUATION_OPTIONS = [
  {
    value: 'student' as const,
    label: 'Student',
    description:
      'Enrolled at an Australian university — verify with your student email, photo ID, and enrolment.',
  },
  {
    value: 'working' as const,
    label: 'Working',
    description: 'Employed in Australia — add employment details, photo ID, and a supporting document.',
  },
  {
    value: 'working_holiday' as const,
    label: 'Working holiday',
    description: 'On a working holiday visa — add visa details, photo ID, and a supporting document.',
  },
  {
    value: 'backpacker' as const,
    label: 'Backpacker',
    description: 'Travelling — add visa details if applicable, photo ID, and a supporting document.',
  },
  {
    value: 'retired' as const,
    label: 'Retired',
    description: 'Not in paid work — photo ID, supporting document, and income source.',
  },
  {
    value: 'between_jobs' as const,
    label: 'Between jobs',
    description: 'Between roles — photo ID, supporting document, and income source.',
  },
] as const

/** Derive verification route from section-0 situation (Stage 4 save will persist both). */
export function deriveAccommodationRouteFromSituation(
  situation: RenterSituation | string | null | undefined,
): 'student' | 'non_student' | null {
  const s = typeof situation === 'string' ? situation.trim() : ''
  if (!s) return null
  return s === 'student' ? 'student' : 'non_student'
}

/** Stored route wins; else infer from `renter_situation` when situation chosen but route not yet saved. */
export function effectiveAccommodationRoute(profile: {
  accommodation_verification_route?: 'student' | 'non_student' | null
  renter_situation?: RenterSituation | null
}): 'student' | 'non_student' | null {
  if (profile.accommodation_verification_route != null) {
    return profile.accommodation_verification_route
  }
  return deriveAccommodationRouteFromSituation(profile.renter_situation)
}

export function hasRenterSituationChosen(
  profile: { renter_situation?: RenterSituation | null } | null | undefined,
): boolean {
  return profile?.renter_situation != null
}
