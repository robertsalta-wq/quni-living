/**
 * Booking-level bond: populate at apply, scale on rent override, resolve for doc-gen.
 */

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
 * Bond at apply from listing properties.bond (prod always set).
 * @param {{ bond?: unknown }} property
 * @returns {number | null}
 */
export function bondAmountAtApplyFromProperty(property) {
  return parsePropertyBondAud(property?.bond)
}

/**
 * @param {unknown} bookingBond
 * @param {unknown} propertyBond
 * @param {unknown} weeklyRent
 * @returns {number | null}
 */
export function resolveBookingBondAmountAud(bookingBond, propertyBond, weeklyRent) {
  const fromBooking = parsePropertyBondAud(bookingBond)
  if (fromBooking != null) return fromBooking

  const fromProperty = parsePropertyBondAud(propertyBond)
  if (fromProperty != null) return fromProperty

  const rent = Number(weeklyRent)
  if (Number.isFinite(rent) && rent > 0) {
    return Math.round(rent * 4 * 100) / 100
  }
  return null
}

/**
 * Proportional bond when agreed rent changes: preserve landlord-set ratio.
 * @param {number} propertyBondAud
 * @param {number} applyWeeklyRentAud
 * @param {number} agreedWeeklyRentAud
 * @returns {number}
 */
export function recomputeBondForAgreedRent(propertyBondAud, applyWeeklyRentAud, agreedWeeklyRentAud) {
  const propBond = parsePropertyBondAud(propertyBondAud)
  const applyRent = Number(applyWeeklyRentAud)
  const agreedRent = Number(agreedWeeklyRentAud)
  if (propBond == null || !Number.isFinite(applyRent) || applyRent <= 0 || !Number.isFinite(agreedRent) || agreedRent <= 0) {
    throw new Error('Invalid bond recompute inputs')
  }
  return Math.round(((propBond * agreedRent) / applyRent) * 100) / 100
}

/**
 * T2 residential statutory cap (weeks × agreed rent). Returns null when cap check does not apply.
 * @param {{ supported?: boolean; tier?: string; rules?: { bond?: { schemeApplies?: boolean; maxBondMonths?: number | null } } | null }} pkg
 * @param {number} agreedWeeklyRentAud
 * @returns {number | null}
 */
export function statutoryBondCapAudForOverride(pkg, agreedWeeklyRentAud) {
  if (!pkg?.supported || pkg.tier !== 'T2') return null
  const bond = pkg.rules?.bond
  if (!bond?.schemeApplies) return null
  const rent = Number(agreedWeeklyRentAud)
  if (!Number.isFinite(rent) || rent <= 0) return null
  const months = bond.maxBondMonths
  const weeks = months != null && Number.isFinite(Number(months)) ? Number(months) * 4 : 4
  return Math.round(weeks * rent * 100) / 100
}
