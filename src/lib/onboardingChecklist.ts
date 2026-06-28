import type { Database } from './database.types'
import { isLandlordPublishComplete } from './landlordProfileReadiness'
import { computeRenterReadiness } from './renterReadiness'

export type StudentProfileRow = Database['public']['Tables']['student_profiles']['Row']
export type LandlordProfileRow = Database['public']['Tables']['landlord_profiles']['Row']

const ONBOARDING_DISMISS_KEY = 'quni_onboarding_dismissed'

export function clearOnboardingDismissed(): void {
  try {
    localStorage.removeItem(ONBOARDING_DISMISS_KEY)
  } catch {
    /* ignore */
  }
}

/** university, course, weekly budget range, and phone - required for enquiries / bookings checklist step. */
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

/** Tenant can send enquiries and booking requests when live readiness allows. */
export function isStudentListingActionsUnlocked(p: StudentProfileRow | null | undefined): boolean {
  return computeRenterReadiness(p).canRequestBooking
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

/** Personal details, address, bio, and agreements — enough to create and edit property listings. */
export function canLandlordCreateListing(p: LandlordProfileRow | null | undefined): boolean {
  return isLandlordPublishComplete(p)
}

/** Full operational unlock (payouts ready). Paid booking acceptance still checks Stripe in API. */
export function isLandlordListingUnlocked(p: LandlordProfileRow | null | undefined): boolean {
  return canLandlordCreateListing(p) && isLandlordStripePayoutsComplete(p)
}
