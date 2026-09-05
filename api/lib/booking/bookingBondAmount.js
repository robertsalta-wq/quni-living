/**
 * Bond resolution: listing weeks config, invite/acceptance overrides, booking snapshot.
 */

import { resolveTenancyPackage } from '../resolveTenancyPackage.js'

/** Statutory cap in weeks for live states (NSW, QLD). VIC multipliers parked. */
export const MAX_BOND_WEEKS = 4

/** Boarding Houses Act occupancy principle 8: two weeks occupancy fee. */
export const T3_MAX_SECURITY_DEPOSIT_WEEKS = 2

export const DEFAULT_BOND_WEEKS = 2

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function parsePropertyBondAud(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

/**
 * @param {number} n
 * @returns {number}
 */
export function roundBondAud(n) {
  return Math.round(n * 100) / 100
}

/**
 * @param {unknown} value
 * @param {number} [maxWeeks]
 * @returns {number | null}
 */
export function parseBondWeeks(value, maxWeeks = MAX_BOND_WEEKS) {
  if (value === null || value === undefined || value === '') return null
  const n = Math.floor(Number(value))
  const max = Number.isFinite(Number(maxWeeks)) ? Number(maxWeeks) : MAX_BOND_WEEKS
  if (!Number.isFinite(n) || n < 0 || n > max) return null
  return n
}

/**
 * Weekly equivalent of an occupancy fee (v1 is weekly; month/year supported for later print).
 * @param {unknown} amount
 * @param {string} [period]
 * @returns {number | null}
 */
export function occupancyFeeWeeklyEquivalentAud(amount, period = 'week') {
  const n = Number(amount)
  if (!Number.isFinite(n) || n <= 0) return null
  const p = String(period || 'week').toLowerCase()
  if (p === 'month') return roundBondAud((n * 12) / 52)
  if (p === 'year') return roundBondAud(n / 52)
  return roundBondAud(n)
}

/**
 * @param {unknown} weeklyEquivalent
 * @returns {number | null}
 */
export function t3SecurityDepositCapAud(weeklyEquivalent) {
  const w = Number(weeklyEquivalent)
  if (!Number.isFinite(w) || w <= 0) return null
  return roundBondAud(T3_MAX_SECURITY_DEPOSIT_WEEKS * w)
}

/**
 * @param {unknown} amount
 * @param {unknown} occupancyFeeAmount
 * @param {string} [period]
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function assertT3SecurityDepositCap(amount, occupancyFeeAmount, period = 'week') {
  const parsed = parsePropertyBondAud(amount)
  if (parsed == null) return { ok: true }
  const weekly = occupancyFeeWeeklyEquivalentAud(occupancyFeeAmount, period)
  const cap = t3SecurityDepositCapAud(weekly)
  if (cap != null && parsed > cap) {
    return {
      ok: false,
      message: 'Security deposit exceeds two weeks occupancy fee.',
    }
  }
  return { ok: true }
}

/**
 * @param {object | null | undefined} property
 * @returns {number}
 */
export function maxBondWeeksForProperty(property) {
  if (!property) return MAX_BOND_WEEKS
  const r = resolveTenancyPackage({
    state: typeof property.state === 'string' ? property.state : '',
    property_type: typeof property.property_type === 'string' ? property.property_type : '',
    is_registered_rooming_house: Boolean(property.is_registered_rooming_house),
    rooms_rented_to_residents: property.rooms_rented_to_residents,
  })
  if (r.supported && r.tier === 'T3') return T3_MAX_SECURITY_DEPOSIT_WEEKS
  return MAX_BOND_WEEKS
}

/**
 * Four weeks of applicable weekly rent (single cap helper for all write sites).
 * @param {unknown} weeklyRentAud
 * @returns {number | null}
 */
export function maxBondCapAud(weeklyRentAud) {
  const rent = Number(weeklyRentAud)
  if (!Number.isFinite(rent) || rent <= 0) return null
  return roundBondAud(MAX_BOND_WEEKS * rent)
}

/**
 * @param {unknown} bondAmountAud
 * @param {unknown} weeklyRentAud
 * @param {number} [maxWeeks]
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function assertBondWithinCap(bondAmountAud, weeklyRentAud, maxWeeks = MAX_BOND_WEEKS) {
  const amount = parsePropertyBondAud(bondAmountAud)
  if (amount == null) return { ok: true }
  const rent = Number(weeklyRentAud)
  if (!Number.isFinite(rent) || rent <= 0) return { ok: true }
  const weeks = Number.isFinite(Number(maxWeeks)) ? Number(maxWeeks) : MAX_BOND_WEEKS
  const cap = roundBondAud(weeks * rent)
  if (amount > cap) {
    return {
      ok: false,
      message:
        weeks === T3_MAX_SECURITY_DEPOSIT_WEEKS
          ? 'Security deposit exceeds two weeks occupancy fee.'
          : 'Bond exceeds the four-week statutory cap for this weekly rent.',
    }
  }
  return { ok: true }
}

/**
 * Listing bond in AUD from weeks config (pre-booking / fallback).
 * @param {object | null | undefined} property
 * @param {unknown} applicableWeeklyRent
 * @returns {number | null}
 */
export function resolveListingBondAud(property, applicableWeeklyRent) {
  const rent = Number(applicableWeeklyRent)
  if (!property || !Number.isFinite(rent) || rent <= 0) return null

  const weeks = parseBondWeeks(property.bond_weeks)
  if (weeks == null || weeks === 0) return null
  return roundBondAud(weeks * rent)
}

/**
 * Invite bond: invite weeks override when set, else listing default.
 * @param {object | null | undefined} property
 * @param {{ offered_bond_weeks?: unknown } | null | undefined} invite
 * @param {unknown} applicableWeeklyRent
 * @returns {number | null}
 */
export function resolveInviteBondAud(property, invite, applicableWeeklyRent) {
  const rent = Number(applicableWeeklyRent)
  if (!Number.isFinite(rent) || rent <= 0) return null

  if (invite?.offered_bond_weeks != null && invite.offered_bond_weeks !== '') {
    const w = parseBondWeeks(invite.offered_bond_weeks)
    if (w == null) return resolveListingBondAud(property, rent)
    if (w === 0) return null
    return roundBondAud(w * rent)
  }

  return resolveListingBondAud(property, rent)
}

/**
 * Bond at apply from listing + optional invite override.
 * @param {object} property
 * @param {unknown} applicableWeeklyRent
 * @param {{ offered_bond_weeks?: unknown } | null | undefined} [invite]
 * @returns {number | null}
 */
export function bondAmountAtApplyFromProperty(property, applicableWeeklyRent, invite = null) {
  const hasInviteBond =
    invite != null &&
    (invite.offered_bond_weeks != null || invite.offered_bond_weeks === 0)
  if (hasInviteBond) {
    return resolveInviteBondAud(property, invite, applicableWeeklyRent)
  }
  return resolveListingBondAud(property, applicableWeeklyRent)
}

/**
 * Booking snapshot wins; else derive from listing weeks at applicable rent.
 * @param {unknown} bookingBond
 * @param {object | null | undefined} property
 * @param {unknown} applicableWeeklyRent
 * @returns {number | null}
 */
export function resolveBookingBondAmountAud(bookingBond, property, applicableWeeklyRent) {
  const fromBooking = parsePropertyBondAud(bookingBond)
  if (fromBooking != null) return fromBooking
  return resolveListingBondAud(property, applicableWeeklyRent)
}

/**
 * Effective bond weeks: acceptance override → invite override → listing default.
 * @param {object} property
 * @param {unknown} rentBreakdown
 * @returns {number | null}
 */
export function effectiveBondWeeksFromBreakdown(property, rentBreakdown) {
  const rb =
    rentBreakdown && typeof rentBreakdown === 'object' && !Array.isArray(rentBreakdown)
      ? rentBreakdown
      : {}

  if (rb.acceptance_bond_weeks != null && rb.acceptance_bond_weeks !== '') {
    const w = parseBondWeeks(rb.acceptance_bond_weeks)
    if (w != null) return w
  }
  if (rb.invite_bond_weeks != null && rb.invite_bond_weeks !== '') {
    const w = parseBondWeeks(rb.invite_bond_weeks)
    if (w != null) return w
  }
  return parseBondWeeks(property?.bond_weeks)
}

/**
 * Re-resolve bond when agreed rent changes (weeks × rent self-scales).
 * @param {object} property
 * @param {unknown} _bookingBondAmount
 * @param {unknown} _applyWeeklyRentAud
 * @param {unknown} agreedWeeklyRentAud
 * @param {unknown} rentBreakdown
 * @returns {number | null}
 */
export function recomputeBondForAgreedRent(
  property,
  _bookingBondAmount,
  _applyWeeklyRentAud,
  agreedWeeklyRentAud,
  rentBreakdown,
) {
  const rent = Number(agreedWeeklyRentAud)
  if (!Number.isFinite(rent) || rent <= 0) {
    throw new Error('Invalid bond recompute inputs')
  }

  const weeks = effectiveBondWeeksFromBreakdown(property, rentBreakdown)
  if (weeks == null || weeks === 0) return null
  return roundBondAud(weeks * rent)
}

/**
 * Resolve explicit acceptance bond override (weeks) to dollars.
 * @param {{ weeks?: number | null }} override
 * @param {unknown} applicableWeeklyRentAud
 * @returns {number | null}
 */
export function resolveAcceptanceBondOverrideAud(override, applicableWeeklyRentAud) {
  const rent = Number(applicableWeeklyRentAud)
  if (!Number.isFinite(rent) || rent <= 0) return null

  if (override.weeks != null) {
    if (override.weeks === 0) return null
    const w = parseBondWeeks(override.weeks)
    if (w == null || w === 0) return null
    return roundBondAud(w * rent)
  }
  return null
}

/**
 * @deprecated Use maxBondCapAud - kept for call-site churn during transition.
 * @param {unknown} _pkg
 * @param {number} agreedWeeklyRentAud
 * @returns {number | null}
 */
export function statutoryBondCapAudForOverride(_pkg, agreedWeeklyRentAud) {
  return maxBondCapAud(agreedWeeklyRentAud)
}
