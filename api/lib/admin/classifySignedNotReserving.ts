import { leaseDocBlocksBondExpiry } from '../booking/guardSignedLeaseExpiry.js'

/**
 * Living Console attention: fully-signed lease on a booking that is already
 * dead (`expired` / `cancelled` / `declined`).
 *
 * Tier 1 (`expired`) is reconcilable via admin DocuSeal reconcile.
 * Tier 2 (`cancelled` / `declined`) is investigate-only — never present as
 * reinstatable (withdrawn-booking prohibition).
 *
 * Healthy signed states (`bond_pending`, `confirmed`, `active`) are never flagged.
 */

export type SignedNotReservingRow = {
  bookingId: string
  bookingStatus: string
  docStatus: string | null
  landlordSignedAt: string | null
  studentSignedAt: string | null
}

export type SignedNotReservingAttentionItem = {
  id: string
  tone: 'action' | 'watch'
  text: string
  fixHref: string
}

/** Known smoke / synthetic bookings that must never raise attention. */
export const KNOWN_SMOKE_BOOKING_IDS: ReadonlySet<string> = new Set([
  // SMOKE three-party signing 2026-07-22 — cancelled + orphaned signed doc
  '1b07c4e6-245e-4c51-87ed-b7a5a769405c',
])

const TERMINAL_WITHDRAWN = new Set(['cancelled', 'declined'])

function isFullySigned(row: SignedNotReservingRow): boolean {
  return leaseDocBlocksBondExpiry({
    id: row.bookingId,
    status: row.docStatus,
    landlord_signed_at: row.landlordSignedAt,
    student_signed_at: row.studentSignedAt,
    co_tenant_signed_at: null,
    docuseal_submission_id: null,
  })
}

function bookingHref(status: string, bookingIds: string[]): string {
  if (bookingIds.length === 1) {
    return `/admin/bookings?status=${encodeURIComponent(status)}&selected=${bookingIds[0]}`
  }
  return `/admin/bookings?status=${encodeURIComponent(status)}`
}

/**
 * Classify candidate booking+doc rows into aggregated AttentionItems.
 * `smokeBookingIds` should include denylist + any ids discovered via
 * booking_events.reason starting with `[SMOKE`.
 */
export function classifySignedNotReserving(
  rows: SignedNotReservingRow[],
  opts?: { smokeBookingIds?: ReadonlySet<string> },
): SignedNotReservingAttentionItem[] {
  const smoke = opts?.smokeBookingIds ?? KNOWN_SMOKE_BOOKING_IDS
  const expiredIds: string[] = []
  const withdrawnIds: string[] = []

  for (const row of rows) {
    if (smoke.has(row.bookingId)) continue
    if (!isFullySigned(row)) continue
    const status = (row.bookingStatus ?? '').trim()
    if (status === 'expired') {
      expiredIds.push(row.bookingId)
    } else if (TERMINAL_WITHDRAWN.has(status)) {
      withdrawnIds.push(row.bookingId)
    }
  }

  const items: SignedNotReservingAttentionItem[] = []

  if (expiredIds.length > 0) {
    const n = expiredIds.length
    items.push({
      id: 'signed-on-expired',
      tone: 'action',
      text:
        n === 1
          ? '1 signed lease on an expired booking'
          : `${n} signed leases on expired bookings`,
      fixHref: bookingHref('expired', expiredIds),
    })
  }

  if (withdrawnIds.length > 0) {
    const n = withdrawnIds.length
    items.push({
      id: 'signed-on-withdrawn',
      tone: 'watch',
      text:
        n === 1
          ? '1 signed lease on a withdrawn booking — investigate'
          : `${n} signed leases on withdrawn bookings — investigate`,
      // Single-status filter can't express cancelled|declined; deep-link the first.
      fixHref: bookingHref('cancelled', withdrawnIds),
    })
  }

  return items
}
