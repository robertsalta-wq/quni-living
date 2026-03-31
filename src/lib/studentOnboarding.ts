import type { Database } from './database.types'

export type StudentProfileRow = Database['public']['Tables']['student_profiles']['Row']

export const STUDY_LEVEL_OPTIONS = [
  { value: 'year_1', label: '1st year' },
  { value: 'year_2', label: '2nd year' },
  { value: 'year_3', label: '3rd year' },
  { value: 'year_4', label: '4th year' },
  { value: 'postgraduate', label: 'Postgraduate' },
  { value: 'phd', label: 'PhD' },
] as const

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_say', label: 'Prefer not to say' },
] as const

export const BUDGET_RANGE_OPTIONS = [
  { value: 'under_200', label: 'Under $200', min: 0, max: 199.99 },
  { value: '200_300', label: '$200–$300', min: 200, max: 300 },
  { value: '300_400', label: '$300–$400', min: 300, max: 400 },
  { value: '400_500', label: '$400–$500', min: 400, max: 500 },
  { value: '500_plus', label: '$500+', min: 500, max: 5000 },
] as const

export type BudgetRangeValue = (typeof BUDGET_RANGE_OPTIONS)[number]['value']

export const LEASE_LENGTH_OPTIONS = [
  { value: '3_months', label: '3 months' },
  { value: '6_months', label: '6 months' },
  { value: '12_months', label: '12 months' },
  { value: 'flexible', label: 'Flexible' },
] as const

export function budgetRangeToMinMax(value: BudgetRangeValue): { min: number; max: number } {
  const row = BUDGET_RANGE_OPTIONS.find((o) => o.value === value)
  if (!row) return { min: 0, max: 199.99 }
  return { min: row.min, max: row.max }
}

/** Infer budget dropdown value from stored min/max (best match). */
export function minMaxToBudgetRange(
  min: number | null | undefined,
  max: number | null | undefined,
): BudgetRangeValue | '' {
  if (min == null && max == null) return ''
  for (const o of BUDGET_RANGE_OPTIONS) {
    if (Math.abs(Number(min) - o.min) < 0.01 && Math.abs(Number(max) - o.max) < 0.01) return o.value
  }
  return ''
}

export function isStep1Saved(p: StudentProfileRow): boolean {
  const hasStudy =
    Boolean(p.study_level?.trim()) || (p.year_of_study != null && Number(p.year_of_study) >= 1)
  return Boolean(
    p.first_name?.trim() &&
      p.last_name?.trim() &&
      p.university_id &&
      p.course?.trim() &&
      hasStudy &&
      p.gender?.trim() &&
      p.phone?.trim() &&
      p.budget_min_per_week != null &&
      p.budget_max_per_week != null,
  )
}

export function isStep2Saved(p: StudentProfileRow): boolean {
  return Boolean(p.emergency_contact_name?.trim() && p.emergency_contact_phone?.trim())
}

export function inferStudentOnboardingStep(p: StudentProfileRow): 1 | 2 | 3 {
  if (!isStep1Saved(p)) return 1
  if (!isStep2Saved(p)) return 2
  return 3
}

/** When `student_onboarding.sql` is not applied, step 3 cannot persist `onboarding_complete`; we store this per user on the device so they can finish the flow. */
const CLIENT_ONBOARDING_OK_PREFIX = 'quni_student_onboarding_client_ok:'

export function markStudentOnboardingCompleteClient(userId: string): void {
  try {
    localStorage.setItem(CLIENT_ONBOARDING_OK_PREFIX + userId, new Date().toISOString())
  } catch {
    /* ignore quota / private mode */
  }
}

export function hasClientStudentOnboardingComplete(userId: string): boolean {
  try {
    return Boolean(localStorage.getItem(CLIENT_ONBOARDING_OK_PREFIX + userId))
  } catch {
    return false
  }
}

/** True when the student must complete /onboarding/student before the rest of the app. */
export function needsStudentDetailedOnboarding(
  profile: StudentProfileRow | null | undefined,
  userId?: string | null,
): boolean {
  if (!profile) return false
  if (profile.onboarding_complete === true) return false
  if (userId && hasClientStudentOnboardingComplete(userId)) return false
  return true
}

/** Loose Australian-style phone: digits only count ≥ 9, optional +61 / 0 prefix. */
export function isValidAuPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 9 || digits.length > 15) return false
  return true
}
