/**
 * Booking review v3 — status → layout / title / stepper mapping.
 * Visual SoT: Booking review v3.html (not the MD where they diverge).
 * payment_failed → pre-acceptance shell (Managed deposit PI webhook; Listing fee is 402).
 */

import type { Database } from '../database.types'

export type BookingReviewStatus = Database['public']['Tables']['bookings']['Row']['status']
export type BookingReviewRole = 'landlord' | 'renter'

/** Page density / section defaults driven by booking status. */
export type BookingReviewShell =
  | 'pre'
  | 'accepted'
  | 'confirmed'
  | 'active'
  | 'declined'
  | 'expired'

/** HTML SoT: Request → Bond → Agreement → Active */
export const BOOKING_REVIEW_STEPPER_LABELS = ['Request', 'Bond', 'Agreement', 'Active'] as const

export type BookingReviewStepperIndex = 0 | 1 | 2 | 3

export type BookingReviewLayout = {
  shell: BookingReviewShell
  /** Page `<h1>` — state reflected in the title; no status pill. */
  pageTitle: string
  /** Current stepper index (0 = Request). awaiting_info stays on Request. */
  stepperIndex: BookingReviewStepperIndex
  /** True when tenancy is fully through Active (active / completed). */
  stepperComplete: boolean
  /** expired / cancelled-like: disable accept, tier, editors, composers where wired later. */
  inputsDisabled: boolean
  /**
   * Landlord-only pre-acceptance chooser + backups.
   * Hidden for awaiting_info (still pre shell) and all non-pre shells.
   */
  showTierChooser: boolean
  showBackupsWarning: boolean
  /** Agreement panel — bond-state onward (§2.8 / HTML `!isPreish`). */
  showAgreement: boolean
  /** Activity section — same gate as agreement (accepted density onward). */
  showActivity: boolean
  /** AI + Fit default open in pre/bond; auto-collapsed in confirmed/active. */
  evaluationDefaultOpen: boolean
  /** Applicant collapses to summary only in confirmed/active (landlord). */
  applicantCollapsible: boolean
  applicantDefaultOpen: boolean
  /** Messages open by default (decision context). */
  messagesDefaultOpen: boolean
  /** Agreement + Activity always start collapsed. */
  agreementDefaultOpen: boolean
  activityDefaultOpen: boolean
}

function isPreAcceptanceStatus(status: BookingReviewStatus): boolean {
  return (
    status === 'pending' ||
    status === 'pending_payment' ||
    status === 'pending_confirmation' ||
    status === 'awaiting_info' ||
    status === 'payment_failed' ||
    status === 'expired'
  )
}

function pageTitleFor(role: BookingReviewRole, status: BookingReviewStatus): string {
  if (status === 'declined') return 'Request declined'
  if (status === 'cancelled') return 'Booking cancelled'
  if (status === 'expired') return 'Request expired'
  // Managed deposit-auth PI failure — landlord waits on the renter; only the renter retries.
  if (status === 'payment_failed') {
    return role === 'landlord' ? 'Waiting on payment' : 'Payment failed'
  }
  if (status === 'completed') return 'Tenancy complete'

  const titles: Record<
    BookingReviewRole,
    Partial<Record<BookingReviewStatus, string>>
  > = {
    landlord: {
      pending: 'Booking request',
      pending_payment: 'Booking request',
      pending_confirmation: 'Booking request',
      awaiting_info: 'Awaiting response',
      bond_pending: 'Bond pending',
      confirmed: 'Awaiting signature',
      active: 'Tenancy active',
    },
    renter: {
      pending: 'Request sent',
      pending_payment: 'Request sent',
      pending_confirmation: 'Request sent',
      awaiting_info: 'Reply needed',
      bond_pending: 'Bond due',
      confirmed: 'Awaiting signature',
      active: 'Tenancy active',
    },
  }

  return titles[role][status] ?? (role === 'landlord' ? 'Booking request' : 'Request sent')
}

function shellFor(status: BookingReviewStatus): BookingReviewShell {
  switch (status) {
    case 'declined':
    case 'cancelled':
      return 'declined'
    case 'expired':
      return 'expired'
    case 'payment_failed':
    case 'pending':
    case 'pending_payment':
    case 'pending_confirmation':
    case 'awaiting_info':
      return 'pre'
    case 'bond_pending':
      return 'accepted'
    case 'confirmed':
      return 'confirmed'
    case 'active':
    case 'completed':
      return 'active'
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

function stepperIndexFor(status: BookingReviewStatus): BookingReviewStepperIndex {
  switch (status) {
    case 'bond_pending':
      return 1
    case 'confirmed':
      return 2
    case 'active':
    case 'completed':
      return 3
    default:
      // pre / awaiting_info / expired / payment_failed / declined / cancelled → Request
      return 0
  }
}

/**
 * Maps booking status (+ role) to v3 review layout flags.
 * Does not inspect account gates, QLD, or tier — those remain separate.
 */
export function resolveBookingReviewLayout(
  status: BookingReviewStatus,
  role: BookingReviewRole,
): BookingReviewLayout {
  const shell = shellFor(status)
  const stepperIndex = stepperIndexFor(status)
  const stepperComplete = status === 'active' || status === 'completed'
  const inputsDisabled = status === 'expired' || status === 'cancelled' || status === 'declined'

  const isPreish = status === 'pending_confirmation' || status === 'awaiting_info' ||
    status === 'pending' || status === 'pending_payment' || status === 'payment_failed' ||
    status === 'expired'
  // Strict "pre only" for tier/backups — awaiting_info + payment_failed hide them
  // (nothing to accept until the renter's deposit auth succeeds).
  const isLandlordPreOnly =
    role === 'landlord' &&
    (status === 'pending_confirmation' || status === 'pending' || status === 'pending_payment')

  const showAgreement = !isPreish && shell !== 'declined' && shell !== 'expired'
  // Keep agreement/activity available on accepted+ shells; declined/expired hide them.
  const showActivity = showAgreement

  const evaluationDefaultOpen = shell === 'pre' || shell === 'accepted' || shell === 'expired'
  const applicantCollapsible = shell === 'confirmed' || shell === 'active'
  const applicantDefaultOpen = !applicantCollapsible

  return {
    shell,
    pageTitle: pageTitleFor(role, status),
    stepperIndex,
    stepperComplete,
    inputsDisabled,
    showTierChooser: isLandlordPreOnly && !inputsDisabled,
    showBackupsWarning: isLandlordPreOnly && !inputsDisabled,
    showAgreement,
    showActivity,
    evaluationDefaultOpen,
    applicantCollapsible,
    applicantDefaultOpen,
    messagesDefaultOpen: true,
    agreementDefaultOpen: false,
    activityDefaultOpen: false,
  }
}

/** Convenience — payment_failed must reuse the pre-acceptance shell. */
export function bookingReviewShellForStatus(status: BookingReviewStatus): BookingReviewShell {
  return shellFor(status)
}

/** True when status is still in the request / respond window (incl. payment_failed). */
export function isBookingReviewPreAcceptanceStatus(status: BookingReviewStatus): boolean {
  return isPreAcceptanceStatus(status)
}
