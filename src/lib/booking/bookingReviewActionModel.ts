/**
 * Booking review v3 — action-card copy by role × status (commit 5b).
 * Pure copy resolution only; buttons/handlers stay wired in the page (existing API calls).
 * Visual SoT: Booking-review-v3-unpacked.html ACTION MODEL (~1538-1612) + MD §6/§11/§17.
 */
import type { Database } from '../database.types'

export type BookingReviewActionStatus = Database['public']['Tables']['bookings']['Row']['status']

export type BookingReviewActionEyebrowTone = 'action' | 'status'
export type BookingReviewActionDeadlineTone = 'info' | 'warning'

export type BookingReviewActionCopy = {
  eyebrow: string
  eyebrowTone: BookingReviewActionEyebrowTone
  title: string
  sub: string | null
  deadlineLabel: string | null
  deadlineTone: BookingReviewActionDeadlineTone
}

type MessageLike = {
  sender_role: 'landlord' | 'student'
  message: string
  created_at: string
}

export type LandlordAwaitingInfoQuestion = {
  text: string
  askedAtIso: string
  askedAtLabel: string
}

/** en-AU, no year — matches HTML deadline pill copy ("Asked 8 Jul"). */
export function formatBookingReviewShortDate(iso: string | null | undefined): string | null {
  const t = iso?.trim()
  if (!t) return null
  try {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(`${t}T12:00:00`) : new Date(t)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  } catch {
    return null
  }
}

/** Latest landlord-authored message in the (legacy, read-only) booking_messages thread — the "question you sent". */
export function resolveLandlordAwaitingInfoQuestion(
  messages: MessageLike[] | null | undefined,
): LandlordAwaitingInfoQuestion | null {
  if (!messages?.length) return null
  const landlordMessages = messages.filter((m) => m.sender_role === 'landlord' && m.message.trim())
  if (!landlordMessages.length) return null
  const latest = landlordMessages[landlordMessages.length - 1]
  const askedAtLabel = formatBookingReviewShortDate(latest.created_at)
  if (!askedAtLabel) return null
  return { text: latest.message.trim(), askedAtIso: latest.created_at, askedAtLabel }
}

export type LandlordBookingReviewActionCopyInput = {
  status: BookingReviewActionStatus
  studentDisplayName: string
  /** Pre-formatted "Asked 8 Jul" style label, or null if no request-info message on record. */
  askedAtLabel: string | null
  /** Pre-formatted bond deadline label (existing page logic — may include a full date). */
  bondDeadlineLabel: string | null
  /** True when the readiness driver / non-gate blocker is showing (drives eyebrow tone for pre). */
  hasActionRequired: boolean
}

/**
 * Landlord action-card copy for every real booking status — HTML SoT §6/§11/§17.
 * Callers still own which buttons/children render below this copy (existing handlers).
 */
export function resolveLandlordBookingReviewActionCopy(
  input: LandlordBookingReviewActionCopyInput,
): BookingReviewActionCopy {
  const name = input.studentDisplayName.trim() || 'the applicant'

  switch (input.status) {
    case 'pending':
    case 'pending_payment':
    case 'pending_confirmation':
      return {
        eyebrow: input.hasActionRequired ? 'What you need to do' : 'Status',
        eyebrowTone: input.hasActionRequired ? 'action' : 'status',
        title: `Respond to ${name}`,
        sub: 'Accept to lock in the tenancy and unlock bond and agreement, or decline.',
        deadlineLabel: null,
        deadlineTone: 'info',
      }
    case 'awaiting_info':
      return {
        eyebrow: 'Awaiting response',
        eyebrowTone: 'status',
        title: 'Waiting on the applicant',
        sub: `You asked ${name} for more information. We'll let you know as soon as they reply.`,
        deadlineLabel: input.askedAtLabel ? `Asked ${input.askedAtLabel}` : null,
        deadlineTone: 'info',
      }
    case 'bond_pending':
      return {
        eyebrow: 'What you need to do',
        eyebrowTone: 'action',
        title: 'Confirm the bond',
        sub: `${name} pays the bond directly to you. Confirm once it lands to progress.`,
        deadlineLabel: input.bondDeadlineLabel,
        deadlineTone: 'warning',
      }
    case 'confirmed':
      return {
        eyebrow: "What's next",
        eyebrowTone: 'status',
        title: 'Chase the signature',
        sub: `Bond received. Waiting on ${name} to sign the tenancy agreement.`,
        deadlineLabel: null,
        deadlineTone: 'info',
      }
    case 'active':
      return {
        eyebrow: 'Status',
        eyebrowTone: 'status',
        title: 'Tenancy is active',
        sub: "Everything is done — nothing needs your attention right now.",
        deadlineLabel: null,
        deadlineTone: 'info',
      }
    case 'completed':
      return {
        eyebrow: 'Status',
        eyebrowTone: 'status',
        title: 'Tenancy was active',
        sub: 'This tenancy has ended.',
        deadlineLabel: null,
        deadlineTone: 'info',
      }
    case 'declined':
    case 'cancelled':
      return {
        eyebrow: 'Status',
        eyebrowTone: 'status',
        title: 'Request declined',
        sub: 'The room remains listed for other students.',
        deadlineLabel: null,
        deadlineTone: 'info',
      }
    case 'expired':
      return {
        eyebrow: 'Status',
        eyebrowTone: 'status',
        title: 'Request expired — room stays listed',
        sub: 'This request expired before it was accepted.',
        deadlineLabel: null,
        deadlineTone: 'info',
      }
    case 'payment_failed':
      return {
        eyebrow: 'Status',
        eyebrowTone: 'status',
        title: "Waiting on the applicant's payment",
        sub: `${name}'s deposit authorisation didn't go through. We'll let you know if they retry.`,
        deadlineLabel: null,
        deadlineTone: 'info',
      }
    default: {
      const _exhaustive: never = input.status
      return _exhaustive
    }
  }
}

export type RenterBookingReviewActionCopyInput = {
  status: BookingReviewActionStatus
  landlordDisplayName: string
  askedAtLabel: string | null
  sentAtLabel: string | null
  bondDeadlineLabel: string | null
  /** From `renterBookingObligation` — takes precedence over the generic sub when present. */
  obligationSub: string | null
}

/** Renter action-card copy — HTML SoT §6/§8/§11/§17 (role-flipped mirror of the landlord model). */
export function resolveRenterBookingReviewActionCopy(
  input: RenterBookingReviewActionCopyInput,
): BookingReviewActionCopy {
  const host = input.landlordDisplayName.trim() || 'your host'

  switch (input.status) {
    case 'pending':
    case 'pending_payment':
    case 'pending_confirmation':
      return {
        eyebrow: 'Status',
        eyebrowTone: 'status',
        title: 'Request sent',
        sub: input.obligationSub ?? `Waiting for ${host} to respond. We'll let you know as soon as they do.`,
        deadlineLabel: input.sentAtLabel ? `Sent ${input.sentAtLabel}` : null,
        deadlineTone: 'info',
      }
    case 'awaiting_info':
      return {
        eyebrow: 'What you need to do',
        eyebrowTone: 'action',
        title: 'Your host needs more information',
        sub: input.obligationSub ?? 'Reply so your booking can continue.',
        deadlineLabel: input.askedAtLabel ? `Asked ${input.askedAtLabel}` : null,
        deadlineTone: 'warning',
      }
    case 'bond_pending':
      return {
        eyebrow: 'What you need to do',
        eyebrowTone: 'action',
        title: 'Pay your bond',
        sub: input.obligationSub ?? `Pay your bond directly to ${host} to secure the room and start your lease.`,
        deadlineLabel: input.bondDeadlineLabel,
        deadlineTone: 'warning',
      }
    case 'confirmed':
      return {
        eyebrow: 'What you need to do',
        eyebrowTone: 'action',
        title: 'Sign your agreement',
        sub: input.obligationSub ?? 'Bond received. Review and sign your tenancy agreement to move in.',
        deadlineLabel: null,
        deadlineTone: 'info',
      }
    case 'active':
      return {
        eyebrow: 'Status',
        eyebrowTone: 'status',
        title: "You're all set",
        sub: 'Your tenancy is active.',
        deadlineLabel: null,
        deadlineTone: 'info',
      }
    case 'completed':
      return {
        eyebrow: 'Status',
        eyebrowTone: 'status',
        title: 'Tenancy complete',
        sub: 'This tenancy has ended.',
        deadlineLabel: null,
        deadlineTone: 'info',
      }
    case 'declined':
    case 'cancelled':
      return {
        eyebrow: 'Status',
        eyebrowTone: 'status',
        title: 'Request declined',
        sub: null,
        deadlineLabel: null,
        deadlineTone: 'info',
      }
    case 'expired':
      return {
        eyebrow: 'Status',
        eyebrowTone: 'status',
        title: 'Request expired',
        sub: 'This request expired before your host responded.',
        deadlineLabel: null,
        deadlineTone: 'info',
      }
    case 'payment_failed':
      return {
        eyebrow: 'What you need to do',
        eyebrowTone: 'action',
        title: 'Payment failed',
        sub: "Your deposit authorisation didn't go through. Retry to keep your request active.",
        deadlineLabel: null,
        deadlineTone: 'warning',
      }
    default: {
      const _exhaustive: never = input.status
      return _exhaustive
    }
  }
}
