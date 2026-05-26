/**
 * Resolve weekly rent from property base rent + occupancy surcharges.
 * Keep in sync with src/lib/pricing/resolveWeeklyRent.ts
 */

/** @typedef {'INVALID_BASE_RENT' | 'INVALID_OCCUPANT_COUNT' | 'OCCUPANTS_EXCEED_MAX' | 'PARKING_NOT_AVAILABLE'} ResolveWeeklyRentErrorCode */

export class ResolveWeeklyRentError extends Error {
  /**
   * @param {ResolveWeeklyRentErrorCode} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message)
    this.name = 'ResolveWeeklyRentError'
    /** @type {ResolveWeeklyRentErrorCode} */
    this.code = code
  }
}

/**
 * @typedef {Object} OccupancyPricingProperty
 * @property {number | string | null | undefined} rent_per_week
 * @property {number | null | undefined} max_occupants
 * @property {number | string | null | undefined} couple_surcharge_per_week
 * @property {number | string | null | undefined} parking_surcharge_per_week
 * @property {boolean | null | undefined} parking_available
 */

/**
 * @typedef {Object} ResolveWeeklyRentInput
 * @property {number} occupantCount
 * @property {boolean} [parkingSelected]
 */

/**
 * @typedef {{ base: number, couple?: number, parking?: number }} RentBreakdownAud
 */

/**
 * @typedef {Object} ResolveWeeklyRentResult
 * @property {number} weeklyRent
 * @property {number} weeklyRentCents
 * @property {RentBreakdownAud} breakdownAud
 * @property {{ base: number, couple?: number, parking?: number }} breakdownCents
 */

/**
 * @param {unknown} value
 * @param {number} fallback
 */
function parseMaxOccupants(value, fallback = 1) {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(10, n)
}

/**
 * @param {unknown} value
 */
function parseOccupantCount(value) {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n < 1) {
    throw new ResolveWeeklyRentError('INVALID_OCCUPANT_COUNT', 'Occupant count must be at least 1')
  }
  if (n > 10) {
    throw new ResolveWeeklyRentError('INVALID_OCCUPANT_COUNT', 'Occupant count cannot exceed 10')
  }
  return n
}

/**
 * @param {unknown} value
 */
function parseAudAmount(value) {
  if (value == null || value === '') return 0
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

/**
 * @param {OccupancyPricingProperty} property
 * @param {ResolveWeeklyRentInput} input
 * @returns {ResolveWeeklyRentResult}
 */
export function resolveWeeklyRent(property, input) {
  const base = parseAudAmount(property?.rent_per_week)
  if (base == null) {
    throw new ResolveWeeklyRentError('INVALID_BASE_RENT', 'Invalid base weekly rent on listing')
  }

  const maxOccupants = parseMaxOccupants(property?.max_occupants, 1)
  const occupantCount = parseOccupantCount(input?.occupantCount)
  const parkingSelected = Boolean(input?.parkingSelected)

  if (occupantCount > maxOccupants) {
    throw new ResolveWeeklyRentError(
      'OCCUPANTS_EXCEED_MAX',
      `This listing allows at most ${maxOccupants} occupant${maxOccupants === 1 ? '' : 's'}`,
    )
  }

  if (parkingSelected && !property?.parking_available) {
    throw new ResolveWeeklyRentError('PARKING_NOT_AVAILABLE', 'Parking is not available on this listing')
  }

  /** @type {RentBreakdownAud} */
  const breakdownAud = { base }

  let weeklyRent = base

  if (occupantCount >= 2) {
    const couple = parseAudAmount(property?.couple_surcharge_per_week) ?? 0
    if (couple > 0) {
      breakdownAud.couple = couple
      weeklyRent += couple
    }
  }

  if (parkingSelected) {
    const parking = parseAudAmount(property?.parking_surcharge_per_week) ?? 0
    if (parking > 0) {
      breakdownAud.parking = parking
      weeklyRent += parking
    }
  }

  weeklyRent = Math.round(weeklyRent * 100) / 100

  /** @type {{ base: number, couple?: number, parking?: number }} */
  const breakdownCents = {
    base: Math.round(breakdownAud.base * 100),
  }
  if (breakdownAud.couple != null) breakdownCents.couple = Math.round(breakdownAud.couple * 100)
  if (breakdownAud.parking != null) breakdownCents.parking = Math.round(breakdownAud.parking * 100)

  return {
    weeklyRent,
    weeklyRentCents: Math.round(weeklyRent * 100),
    breakdownAud,
    breakdownCents,
  }
}

/**
 * @param {OccupancyPricingProperty} property
 */
export function propertyHasVariableOccupancyPricing(property) {
  const couple = parseAudAmount(property?.couple_surcharge_per_week)
  const parking = parseAudAmount(property?.parking_surcharge_per_week)
  return (couple != null && couple > 0) || (parking != null && parking > 0 && Boolean(property?.parking_available))
}

/**
 * Max possible weekly rent for bond helper copy (base + couple + parking if all offered).
 * @param {OccupancyPricingProperty} property
 */
export function maxWeeklyRentForProperty(property) {
  return resolveWeeklyRent(property, {
    occupantCount: parseMaxOccupants(property?.max_occupants, 1),
    parkingSelected: Boolean(property?.parking_available),
  }).weeklyRent
}
