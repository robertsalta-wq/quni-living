/** Client helpers for tenant-invite special rent offers. */

import { resolveInviteBondAud } from '../booking/resolveBookingBondAmount'
import { parseRentOverrideProvenance } from './rentAgreedOverride'

export type TenantInviteOfferDisplay = {
  hasOffer: boolean
  offeredWeeklyRentAud: number | null
  offerReason: string | null
  listingWeeklyRentAud: number | null
  hasBondOffer: boolean
  offeredBondWeeks: number | null
  offeredBondFixed: number | null
}

function parseAud(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

function parseBondWeeksField(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n < 0 || n > 4) return null
  return n
}

export function tenantInviteOfferFromRpcRow(row: {
  offered_weekly_rent?: unknown
  offer_reason?: unknown
  offered_bond_weeks?: unknown
  offered_bond_fixed?: unknown
} | null | undefined): TenantInviteOfferDisplay {
  const offeredWeeklyRentAud = parseAud(row?.offered_weekly_rent)
  const offerReason =
    typeof row?.offer_reason === 'string' && row.offer_reason.trim() ? row.offer_reason.trim() : null
  const offeredBondFixed = parseAud(row?.offered_bond_fixed)
  const offeredBondWeeks = parseBondWeeksField(row?.offered_bond_weeks)
  const hasBondOffer = offeredBondFixed != null || offeredBondWeeks != null
  return {
    hasOffer: offeredWeeklyRentAud != null,
    offeredWeeklyRentAud,
    offerReason,
    listingWeeklyRentAud: null,
    hasBondOffer,
    offeredBondWeeks,
    offeredBondFixed,
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

export function previewInviteBondAud(
  property: object | null | undefined,
  inviteRow: {
    offered_weekly_rent?: unknown
    offered_bond_weeks?: unknown
    offered_bond_fixed?: unknown
  } | null | undefined,
  listingWeeklyRentAud: number,
): number | null {
  if (!property) return null
  const rent = effectiveWeeklyRentWithInviteOffer(
    listingWeeklyRentAud,
    parseAud(inviteRow?.offered_weekly_rent),
  )
  return resolveInviteBondAud(property, inviteRow, rent)
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

export function formatBondAmountAud(n: number | null | undefined): string {
  return formatAudWeekly(n)
}
