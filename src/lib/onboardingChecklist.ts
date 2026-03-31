import type { Database } from './database.types'

export type StudentProfileRow = Database['public']['Tables']['student_profiles']['Row']
export type LandlordProfileRow = Database['public']['Tables']['landlord_profiles']['Row']

const ONBOARDING_DISMISS_KEY = 'quni_onboarding_dismissed'

/**
 * Key `quni_onboarding_complete`: value is the `userId` string when that user finished the checklist
 * (same intent as "true" for the active account; supports multiple accounts in one browser).
 */
const ONBOARDING_COMPLETE_LOCAL_KEY = 'quni_onboarding_complete'

export function getOnboardingDismissKey(): string {
  return ONBOARDING_DISMISS_KEY
}

export function isProfileDashboardOnboardingComplete(
  role: 'student' | 'landlord',
  student: StudentProfileRow | null,
  landlord: LandlordProfileRow | null,
): boolean {
  if (role === 'student') return student?.onboarding_complete === true
  return landlord?.onboarding_complete === true
}

export function readOnboardingCompleteLocal(userId: string): boolean {
  try {
    return localStorage.getItem(ONBOARDING_COMPLETE_LOCAL_KEY) === userId
  } catch {
    return false
  }
}

export function writeOnboardingCompleteLocal(userId: string): void {
  try {
    localStorage.setItem(ONBOARDING_COMPLETE_LOCAL_KEY, userId)
  } catch {
    /* ignore */
  }
}

export function clearOnboardingCompleteLocal(): void {
  try {
    localStorage.removeItem(ONBOARDING_COMPLETE_LOCAL_KEY)
  } catch {
    /* ignore */
  }
}

export function readOnboardingDismissedUserId(): string | null {
  try {
    const v = localStorage.getItem(ONBOARDING_DISMISS_KEY)
    return v?.trim() || null
  } catch {
    return null
  }
}

export function writeOnboardingDismissed(userId: string): void {
  try {
    localStorage.setItem(ONBOARDING_DISMISS_KEY, userId)
  } catch {
    /* ignore */
  }
}

export function clearOnboardingDismissed(): void {
  try {
    localStorage.removeItem(ONBOARDING_DISMISS_KEY)
  } catch {
    /* ignore */
  }
}

/** university, course, weekly budget range, and phone — required for enquiries / bookings checklist step. */
export function isStudentCoreProfileComplete(p: StudentProfileRow | null | undefined): boolean {
  if (!p) return false
  const hasBudget =
    p.budget_min_per_week != null &&
    p.budget_max_per_week != null &&
    !Number.isNaN(Number(p.budget_min_per_week)) &&
    !Number.isNaN(Number(p.budget_max_per_week))
  return Boolean(
    p.university_id &&
      p.course?.trim() &&
      p.phone?.trim() &&
      hasBudget,
  )
}

/** Student can send enquiries and booking requests. */
export function isStudentListingActionsUnlocked(p: StudentProfileRow | null | undefined): boolean {
  return isStudentCoreProfileComplete(p)
}

export function landlordDisplayNameComplete(p: LandlordProfileRow | null | undefined): boolean {
  if (!p) return false
  if (p.full_name?.trim()) return true
  return Boolean(p.first_name?.trim() && p.last_name?.trim())
}

export function isLandlordProfileBasicsComplete(p: LandlordProfileRow | null | undefined): boolean {
  if (!p) return false
  return landlordDisplayNameComplete(p) && Boolean(p.phone?.trim()) && Boolean(p.bio?.trim())
}

/** Stripe Connect ready for charges and payouts (matches payouts card). */
export function isLandlordStripePayoutsComplete(p: LandlordProfileRow | null | undefined): boolean {
  return p?.stripe_charges_enabled === true && p?.stripe_payouts_enabled === true
}

/** All landlord checklist steps (excl. account) for listing creation. */
export function isLandlordListingUnlocked(p: LandlordProfileRow | null | undefined): boolean {
  if (!p) return false
  return Boolean(
    p.terms_accepted_at &&
      p.landlord_terms_accepted_at &&
      isLandlordProfileBasicsComplete(p) &&
      isLandlordStripePayoutsComplete(p),
  )
}

export type ChecklistStep = {
  id: string
  label: string
  complete: boolean
  href?: string
  actionLabel?: string
  optional?: boolean
}

export function buildStudentOnboardingSteps(p: StudentProfileRow | null | undefined): ChecklistStep[] {
  const profile = p ?? null
  const termsOk = Boolean(profile?.terms_accepted_at)
  const coreOk = isStudentCoreProfileComplete(profile)
  const photoOk = Boolean(profile?.avatar_url?.trim())

  return [
    { id: 'account', label: 'Account created', complete: true },
    {
      id: 'terms',
      label: 'Accept Terms of Service and Privacy Policy',
      complete: termsOk,
      href: '/onboarding/student',
      actionLabel: 'Accept →',
    },
    {
      id: 'profile',
      label: 'Complete your profile',
      complete: coreOk,
      href: '/onboarding/student',
      actionLabel: 'Complete →',
    },
    {
      id: 'photo',
      label: 'Add profile photo',
      complete: photoOk,
      optional: true,
      href: '/student-profile',
      actionLabel: 'Add →',
    },
  ]
}

export function buildLandlordOnboardingSteps(p: LandlordProfileRow | null | undefined): ChecklistStep[] {
  const profile = p ?? null
  const termsOk = Boolean(profile?.terms_accepted_at)
  const landlordTermsOk = Boolean(profile?.landlord_terms_accepted_at)
  const nameOk = landlordDisplayNameComplete(profile)
  const phoneOk = Boolean(profile?.phone?.trim())
  const bioOk = Boolean(profile?.bio?.trim() && profile.bio.trim().length > 20)
  const photoOk = Boolean(profile?.avatar_url?.trim())
  const basicsOk = nameOk && phoneOk && bioOk && photoOk
  const bankChargesOk = profile?.stripe_charges_enabled === true

  return [
    { id: 'account', label: 'Account created', complete: true },
    {
      id: 'terms',
      label: 'Accept Terms of Service and Privacy Policy',
      complete: termsOk,
      href: '/landlord-profile#account-agreements',
      actionLabel: 'Accept →',
    },
    {
      id: 'landlord_terms',
      label: 'Accept Landlord Service Agreement',
      complete: landlordTermsOk,
      href: '/landlord-profile#account-agreements',
      actionLabel: 'Accept →',
    },
    {
      id: 'profile',
      label: 'Complete your profile',
      complete: basicsOk,
      href: '/landlord/profile',
      actionLabel: 'Complete →',
    },
    {
      id: 'stripe',
      label: 'Bank account connected — charges enabled',
      complete: bankChargesOk,
      href: '/landlord-dashboard#rent-payouts',
      actionLabel: 'Connect →',
    },
  ]
}

export function studentChecklistFraction(steps: ChecklistStep[]): { done: number; total: number; pct: number } {
  const total = steps.length
  const done = steps.filter((s) => s.complete).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return { done, total, pct }
}

export function landlordChecklistFraction(steps: ChecklistStep[]): { done: number; total: number; pct: number } {
  const total = steps.length
  const done = steps.filter((s) => s.complete).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return { done, total, pct }
}

export function isStudentChecklistFullyComplete(steps: ChecklistStep[]): boolean {
  return steps.every((s) => s.complete)
}

export function isLandlordChecklistFullyComplete(steps: ChecklistStep[]): boolean {
  return steps.every((s) => s.complete)
}
