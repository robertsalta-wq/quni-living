import type { LandlordSeenStudentVerification } from '../components/landlord/LandlordApplicantVerificationBadges'

export type BookingListVerificationChip = {
  label: string
  variant: 'neutral' | 'navy'
}

/** Sentence-case status for mobile list pills (e.g. confirmed → Confirmed). */
export function bookingListStatusLabel(status: string): string {
  if (status === 'confirmed') return 'Confirmed'
  if (status === 'expired') return 'Expired'
  if (status === 'active') return 'Active'
  if (status === 'terminating') return 'Ending agreement'
  if (status === 'terminated') return 'Ended'
  const spaced = status.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}

export function bookingListStatusPillClass(status: string): string {
  const base = 'inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none'
  // Includes tenant statuses (bond_pending → success; cancelled → danger) so both roles share one map.
  if (status === 'confirmed' || status === 'active' || status === 'bond_pending') {
    return `${base} bg-admin-success-bg text-admin-success-fg`
  }
  if (status === 'terminating') {
    return `${base} bg-admin-warning-bg text-admin-warning-fg`
  }
  if (
    status === 'expired' ||
    status === 'declined' ||
    status === 'payment_failed' ||
    status === 'cancelled' ||
    status === 'terminated'
  ) {
    return `${base} bg-admin-danger-bg text-admin-danger-strong`
  }
  return `${base} bg-admin-surface-3 text-admin-ink-4`
}

export function formatBookingListWeeklyRent(weeklyRent: number | null | undefined): string {
  if (weeklyRent == null || Number.isNaN(Number(weeklyRent))) return '-'
  return `$${Number(weeklyRent).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
}

/** Role-based verification chips for mobile booking cards (not desktop table badges). */
export function buildBookingListVerificationChips(
  verification: LandlordSeenStudentVerification | null | undefined,
): BookingListVerificationChip[] {
  const v = verification
  if (!v) return []

  const chips: BookingListVerificationChip[] = []

  if (v.verification_type === 'student') {
    chips.push({ label: 'Verified student', variant: 'navy' })
    return chips
  }

  if (v.verification_type === 'identity') {
    chips.push({ label: 'Verified identity', variant: 'neutral' })
    if (v.work_email_verified === true) {
      chips.push({ label: 'Work email verified', variant: 'navy' })
    }
    return chips
  }

  const uni = v.uni_email_verified === true
  const work = v.work_email_verified === true
  const id = Boolean(v.id_provided)
  const en = Boolean(v.enrolment_provided)
  const sup = Boolean(v.identity_supporting_provided)

  if (id || sup) {
    chips.push({ label: 'Verified identity', variant: 'neutral' })
  }
  if (uni) chips.push({ label: 'Uni email verified', variant: 'navy' })
  if (work) chips.push({ label: 'Work email verified', variant: 'navy' })
  if (en && !uni) chips.push({ label: 'Enrolment provided', variant: 'neutral' })

  return chips
}
