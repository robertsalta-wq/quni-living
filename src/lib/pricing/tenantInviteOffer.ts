/** Client helpers for tenant-invite special rent offers. */

import { parseRentOverrideProvenance } from './rentAgreedOverride'

export type TenantInviteOfferDisplay = {
  hasOffer: boolean
  offeredWeeklyRentAud: number | null
  offerReason: string | null
  listingWeeklyRentAud: number | null
}

function parseAud(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

export function tenantInviteOfferFromRpcRow(row: {
  offered_weekly_rent?: unknown
  offer_reason?: unknown
} | null | undefined): TenantInviteOfferDisplay {
  const offeredWeeklyRentAud = parseAud(row?.offered_weekly_rent)
  const offerReason =
    typeof row?.offer_reason === 'string' && row.offer_reason.trim() ? row.offer_reason.trim() : null
  return {
    hasOffer: offeredWeeklyRentAud != null,
    offeredWeeklyRentAud,
    offerReason,
    listingWeeklyRentAud: null,
  }
}

/** Effective weekly rent preview when an invite offer applies (offer is fixed total, capped by listing). */
export function effectiveWeeklyRentWithInviteOffer(
  listingWeeklyRentAud: number,
  offeredWeeklyRentAud: number | null | undefined,
): number {
  const listing = parseAud(listingWeeklyRentAud)
  if (listing == null) return listingWeeklyRentAud
  const offer = parseAud(offeredWeeklyRentAud)
  if (offer == null) return listing
  return Math.min(listing, offer)
}

export function bookingHasInviteOfferProvenance(rentBreakdown: unknown): boolean {
  if (!rentBreakdown || typeof rentBreakdown !== 'object' || Array.isArray(rentBreakdown)) return false
  return (rentBreakdown as Record<string, unknown>).invite_offer_applied === true
}

export function inviteOfferNoticeFromBreakdown(rentBreakdown: unknown): {
  applyWeeklyRentAud: number | null
  offeredWeeklyRentAud: number | null
} {
  const prov = parseRentOverrideProvenance(rentBreakdown)
  const invite = bookingHasInviteOfferProvenance(rentBreakdown)
  if (!invite && !prov.overrideApplied) {
    return { applyWeeklyRentAud: null, offeredWeeklyRentAud: null }
  }
  return {
    applyWeeklyRentAud: prov.applyWeeklyRentAud,
    offeredWeeklyRentAud: prov.agreedWeeklyRentAud,
  }
}

export function formatAudWeekly(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '-'
  return `$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}
