/**
 * Booking review v3 — Terms rail summary helpers (landlord voice only; rail is landlord-only).
 * Visual SoT: Booking-review-v3-unpacked.html ~1217-1269 + JS state (~1483-1518).
 * Bond is always its own line — never folded into "Quni holds" (§14).
 */
import type { RentBreakdownAud } from '../pricing/resolveWeeklyRent'
import { formatDate } from '../../pages/admin/adminUi'

export type BookingReviewTermsTier = 'listing' | 'managed'

/** Pre-acceptance-ish statuses — no holding deposit has been collected yet. */
const PRE_ACCEPT_STATUSES = new Set([
  'pending',
  'pending_payment',
  'pending_confirmation',
  'awaiting_info',
  'payment_failed',
  'expired',
])

function fmtAudCents(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(Number(cents))) return '-'
  return `$${(Number(cents) / 100).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
}

function fmtAud(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '-'
  return `$${Number(n).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
}

export type BookingReviewHoldRowInput = {
  tier: BookingReviewTermsTier
  status: string
  /** Managed one-week holding deposit, cents. Null on Listing bookings. */
  depositAmountCents: number | null
  /** Set by the release-deposits cron the day after move-in. */
  depositReleasedAt: string | null
}

export type BookingReviewHoldRow = {
  /** False on Listing (no deposit row at all — bond stays its own line) and pre-accept Managed. */
  show: boolean
  valueLabel: string
  caption: string | null
  /** Tailwind text color class for the value. */
  toneClass: string
}

/**
 * "Quni holds" row visibility + value for the Terms rail (§14).
 * - Listing: never shown — bond and rent go direct; see `resolveBookingReviewHoldNote`.
 * - Managed pre/awaiting_info/payment_failed/expired: not shown — deposit is held from confirmation.
 * - Managed bond_pending/confirmed: shows the held deposit amount, "Until day after move-in".
 * - Managed active/completed: shows $0 (green), captioned with the release date when known.
 */
export function resolveBookingReviewHoldRow(input: BookingReviewHoldRowInput): BookingReviewHoldRow {
  if (input.tier !== 'managed' || PRE_ACCEPT_STATUSES.has(input.status)) {
    return { show: false, valueLabel: '$0', caption: null, toneClass: 'text-admin-ink' }
  }

  const isReleasedPhase = input.status === 'active' || input.status === 'completed'
  if (isReleasedPhase) {
    const releasedLabel = input.depositReleasedAt?.trim() ? formatDate(input.depositReleasedAt.slice(0, 10)) : null
    return {
      show: true,
      valueLabel: '$0',
      caption: releasedLabel ? `Released ${releasedLabel} · after move-in` : 'Released after move-in',
      toneClass: 'text-admin-success-fg',
    }
  }

  return {
    show: true,
    valueLabel: fmtAudCents(input.depositAmountCents),
    caption: 'Until day after move-in',
    toneClass: 'text-admin-ink',
  }
}

/** Beige footer note under the Terms summary — landlord voice, tier + state aware. */
export function resolveBookingReviewHoldNote(input: BookingReviewHoldRowInput): string {
  if (input.tier !== 'managed') {
    return 'Bond and rent are paid to you directly. Quni holds $0 at any point.'
  }

  if (PRE_ACCEPT_STATUSES.has(input.status)) {
    return 'Quni will hold a one-week holding deposit from confirmation until the day after move-in, then release it to you. The bond is lodged by Quni.'
  }

  const isReleasedPhase = input.status === 'active' || input.status === 'completed'
  const amount = fmtAudCents(input.depositAmountCents)
  if (isReleasedPhase) {
    const releasedLabel = input.depositReleasedAt?.trim() ? formatDate(input.depositReleasedAt.slice(0, 10)) : null
    return releasedLabel
      ? `Quni holds $0 — the ${amount} holding deposit was released ${releasedLabel}, the day after move-in. The bond is handled by Quni.`
      : 'Quni holds $0 — the holding deposit has been released. The bond is handled by Quni.'
  }

  return `Quni is holding a ${amount} holding deposit until the day after move-in, then releases it to you. The bond is handled separately by Quni.`
}

export type BookingReviewBreakdownRow = {
  key: string
  label: string
  valueLabel: string
  emphasis?: boolean
  muted?: boolean
}

/** "Rent breakdown & occupants" disclosure table — available every state (em dash when absent). */
export function resolveBookingReviewRentBreakdownRows(input: {
  weeklyRentAud: number | null
  breakdown: RentBreakdownAud | null
  parkingSelected: boolean | null
}): BookingReviewBreakdownRow[] {
  const base = input.breakdown?.base ?? input.weeklyRentAud
  const additional = input.breakdown?.couple ?? null
  const parking = input.parkingSelected === true ? input.breakdown?.parking ?? null : null
  const total = input.weeklyRentAud ?? base

  return [
    { key: 'base', label: 'Base weekly rent', valueLabel: base != null ? `${fmtAud(base)} /wk` : '—' },
    {
      key: 'additional',
      label: 'Additional occupant',
      valueLabel: additional != null ? `+${fmtAud(additional)} /wk` : '—',
      muted: additional == null,
    },
    {
      key: 'parking',
      label: 'Parking',
      valueLabel: parking != null ? `+${fmtAud(parking)} /wk` : '—',
      muted: parking == null,
    },
    { key: 'total', label: 'Total rent', valueLabel: total != null ? `${fmtAud(total)} /wk` : '—', emphasis: true },
  ]
}
