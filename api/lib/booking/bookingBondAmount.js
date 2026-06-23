/**
 * Bond resolution: listing weeks config, invite/acceptance overrides, booking snapshot.
 */

/** Statutory cap in weeks for live states (NSW, QLD). VIC multipliers parked. */
export const MAX_BOND_WEEKS = 4

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
 * @returns {number | null}
 */
export function parseBondWeeks(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n < 0 || n > MAX_BOND_WEEKS) return null
  return n
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
 * @returns {{ ok: true } | { ok: false; message: string }}
 */
export function assertBondWithinCap(bondAmountAud, weeklyRentAud) {
  const amount = parsePropertyBondAud(bondAmountAud)
  if (amount == null) return { ok: true }
  const cap = maxBondCapAud(weeklyRentAud)
  if (cap != null && amount > cap) {
    return {
      ok: false,
      message: 'Bond exceeds the four-week statutory cap for this weekly rent.',
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
 * @deprecated Use maxBondCapAud — kept for call-site churn during transition.
 * @param {unknown} _pkg
 * @param {number} agreedWeeklyRentAud
 * @returns {number | null}
 */
export function statutoryBondCapAudForOverride(_pkg, agreedWeeklyRentAud) {
  return maxBondCapAud(agreedWeeklyRentAud)
}
