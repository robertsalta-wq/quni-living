/**
 * Bond resolution: listing weeks/fixed config, invite/acceptance overrides, booking snapshot.
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
 * @param {object | null | undefined} property
 * @returns {boolean}
 */
export function isPropertyBondFixed(property) {
  return Boolean(property?.bond_is_fixed) && property?.bond_fixed_amount != null
}

/**
 * Listing bond in AUD from weeks or fixed config (pre-booking / fallback).
 * @param {object | null | undefined} property
 * @param {unknown} applicableWeeklyRent
 * @returns {number | null}
 */
export function resolveListingBondAud(property, applicableWeeklyRent) {
  const rent = Number(applicableWeeklyRent)
  if (!property || !Number.isFinite(rent) || rent <= 0) return null

  if (isPropertyBondFixed(property)) {
    const fixed = parsePropertyBondAud(property.bond_fixed_amount)
    if (fixed == null) return null
    const cap = maxBondCapAud(rent)
    return cap != null ? roundBondAud(Math.min(fixed, cap)) : fixed
  }

  const weeks = property.bond_weeks
  if (weeks === null || weeks === undefined) return null
  const w = Number(weeks)
  if (!Number.isFinite(w) || w <= 0) return null
  if (w > MAX_BOND_WEEKS) return null
  return roundBondAud(w * rent)
}

/**
 * Invite bond: invite override when set, else listing default.
 * @param {object | null | undefined} property
 * @param {{ offered_bond_weeks?: unknown; offered_bond_fixed?: unknown } | null | undefined} invite
 * @param {unknown} applicableWeeklyRent
 * @returns {number | null}
 */
export function resolveInviteBondAud(property, invite, applicableWeeklyRent) {
  const rent = Number(applicableWeeklyRent)
  if (!Number.isFinite(rent) || rent <= 0) return null

  if (invite?.offered_bond_fixed != null && invite.offered_bond_fixed !== '') {
    const fixed = parsePropertyBondAud(invite.offered_bond_fixed)
    if (fixed == null) return resolveListingBondAud(property, rent)
    const cap = maxBondCapAud(rent)
    return cap != null ? roundBondAud(Math.min(fixed, cap)) : fixed
  }

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
 * @param {{ offered_bond_weeks?: unknown; offered_bond_fixed?: unknown } | null | undefined} [invite]
 * @returns {number | null}
 */
export function bondAmountAtApplyFromProperty(property, applicableWeeklyRent, invite = null) {
  const hasInviteBond =
    invite != null &&
    (invite.offered_bond_weeks != null ||
      invite.offered_bond_fixed != null ||
      invite.offered_bond_weeks === 0)
  if (hasInviteBond) {
    return resolveInviteBondAud(property, invite, applicableWeeklyRent)
  }
  return resolveListingBondAud(property, applicableWeeklyRent)
}

/**
 * Booking snapshot wins; else derive from listing config at applicable rent.
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
 * @param {unknown} fixedAud
 * @param {unknown} applicableWeeklyRentAud
 * @returns {number}
 */
export function recapFixedBondAud(fixedAud, applicableWeeklyRentAud) {
  const fixed = parsePropertyBondAud(fixedAud)
  const rent = Number(applicableWeeklyRentAud)
  if (fixed == null || !Number.isFinite(rent) || rent <= 0) {
    throw new Error('Invalid fixed bond recap inputs')
  }
  const cap = maxBondCapAud(rent)
  return cap != null ? roundBondAud(Math.min(fixed, cap)) : fixed
}

/**
 * @param {object} property
 * @param {unknown} rentBreakdown
 * @returns {{ mode: 'weeks' | 'fixed' | 'none'; weeks?: number; fixedAmount?: number }}
 */
export function effectiveBondConfigFromBreakdown(property, rentBreakdown) {
  const rb =
    rentBreakdown && typeof rentBreakdown === 'object' && !Array.isArray(rentBreakdown)
      ? rentBreakdown
      : {}

  if (rb.acceptance_bond_fixed != null && rb.acceptance_bond_fixed !== '') {
    const fixed = parsePropertyBondAud(rb.acceptance_bond_fixed)
    if (fixed != null) return { mode: 'fixed', fixedAmount: fixed }
  }
  if (rb.acceptance_bond_weeks != null && rb.acceptance_bond_weeks !== '') {
    const w = parseBondWeeks(rb.acceptance_bond_weeks)
    if (w != null) return w === 0 ? { mode: 'none' } : { mode: 'weeks', weeks: w }
  }
  if (rb.invite_bond_fixed != null && rb.invite_bond_fixed !== '') {
    const fixed = parsePropertyBondAud(rb.invite_bond_fixed)
    if (fixed != null) return { mode: 'fixed', fixedAmount: fixed }
  }
  if (rb.invite_bond_weeks != null && rb.invite_bond_weeks !== '') {
    const w = parseBondWeeks(rb.invite_bond_weeks)
    if (w != null) return w === 0 ? { mode: 'none' } : { mode: 'weeks', weeks: w }
  }

  if (isPropertyBondFixed(property)) {
    const fixed = parsePropertyBondAud(property.bond_fixed_amount)
    if (fixed != null) return { mode: 'fixed', fixedAmount: fixed }
  }

  const w = parseBondWeeks(property?.bond_weeks)
  if (w == null || w === 0) return { mode: 'none' }
  return { mode: 'weeks', weeks: w }
}

/**
 * Re-resolve bond when agreed rent changes (weeks self-scale; fixed re-caps only).
 * @param {object} property
 * @param {unknown} bookingBondAmount
 * @param {unknown} _applyWeeklyRentAud
 * @param {unknown} agreedWeeklyRentAud
 * @param {unknown} rentBreakdown
 * @returns {number | null}
 */
export function recomputeBondForAgreedRent(
  property,
  bookingBondAmount,
  _applyWeeklyRentAud,
  agreedWeeklyRentAud,
  rentBreakdown,
) {
  const rent = Number(agreedWeeklyRentAud)
  if (!Number.isFinite(rent) || rent <= 0) {
    throw new Error('Invalid bond recompute inputs')
  }

  const config = effectiveBondConfigFromBreakdown(property, rentBreakdown)

  if (config.mode === 'fixed') {
    const base = config.fixedAmount ?? parsePropertyBondAud(bookingBondAmount)
    if (base == null) return null
    return recapFixedBondAud(base, rent)
  }

  if (config.mode === 'weeks' && config.weeks != null && config.weeks > 0) {
    return resolveListingBondAud(
      { ...property, bond_is_fixed: false, bond_weeks: config.weeks, bond_fixed_amount: null },
      rent,
    )
  }

  return null
}

/**
 * Resolve explicit acceptance bond override to dollars.
 * @param {{ weeks?: number | null; fixed?: number | null }} override
 * @param {unknown} applicableWeeklyRentAud
 * @returns {number | null}
 */
export function resolveAcceptanceBondOverrideAud(override, applicableWeeklyRentAud) {
  const rent = Number(applicableWeeklyRentAud)
  if (!Number.isFinite(rent) || rent <= 0) return null

  if (override.fixed != null) {
    return recapFixedBondAud(override.fixed, rent)
  }
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
