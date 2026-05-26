/**
 * Resolve weekly rent from property base rent + occupancy surcharges.
 * Keep in sync with api/lib/pricing/resolveWeeklyRent.js
 */

export type ResolveWeeklyRentErrorCode =
  | 'INVALID_BASE_RENT'
  | 'INVALID_OCCUPANT_COUNT'
  | 'OCCUPANTS_EXCEED_MAX'
  | 'PARKING_NOT_AVAILABLE'

export class ResolveWeeklyRentError extends Error {
  readonly code: ResolveWeeklyRentErrorCode

  constructor(code: ResolveWeeklyRentErrorCode, message: string) {
    super(message)
    this.name = 'ResolveWeeklyRentError'
    this.code = code
  }
}

export type OccupancyPricingProperty = {
  rent_per_week: number | string | null | undefined
  max_occupants?: number | null | undefined
  couple_surcharge_per_week?: number | string | null | undefined
  parking_surcharge_per_week?: number | string | null | undefined
  parking_available?: boolean | null | undefined
}

export type ResolveWeeklyRentInput = {
  occupantCount: number
  parkingSelected?: boolean
}

export type RentBreakdownAud = {
  base: number
  couple?: number
  parking?: number
}

export type RentBreakdownCents = {
  base: number
  couple?: number
  parking?: number
}

export type ResolveWeeklyRentResult = {
  weeklyRent: number
  weeklyRentCents: number
  breakdownAud: RentBreakdownAud
  breakdownCents: RentBreakdownCents
}

function parseMaxOccupants(value: unknown, fallback = 1): number {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(10, n)
}

function parseOccupantCount(value: unknown): number {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n < 1) {
    throw new ResolveWeeklyRentError('INVALID_OCCUPANT_COUNT', 'Occupant count must be at least 1')
  }
  if (n > 10) {
    throw new ResolveWeeklyRentError('INVALID_OCCUPANT_COUNT', 'Occupant count cannot exceed 10')
  }
  return n
}

function parseAudAmount(value: unknown): number | null {
  if (value == null || value === '') return 0
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

export function resolveWeeklyRent(
  property: OccupancyPricingProperty,
  input: ResolveWeeklyRentInput,
): ResolveWeeklyRentResult {
  const base = parseAudAmount(property.rent_per_week)
  if (base == null) {
    throw new ResolveWeeklyRentError('INVALID_BASE_RENT', 'Invalid base weekly rent on listing')
  }

  const maxOccupants = parseMaxOccupants(property.max_occupants, 1)
  const occupantCount = parseOccupantCount(input.occupantCount)
  const parkingSelected = Boolean(input.parkingSelected)

  if (occupantCount > maxOccupants) {
    throw new ResolveWeeklyRentError(
      'OCCUPANTS_EXCEED_MAX',
      `This listing allows at most ${maxOccupants} occupant${maxOccupants === 1 ? '' : 's'}`,
    )
  }

  if (parkingSelected && !property.parking_available) {
    throw new ResolveWeeklyRentError('PARKING_NOT_AVAILABLE', 'Parking is not available on this listing')
  }

  const breakdownAud: RentBreakdownAud = { base }
  let weeklyRent = base

  if (occupantCount >= 2) {
    const couple = parseAudAmount(property.couple_surcharge_per_week) ?? 0
    if (couple > 0) {
      breakdownAud.couple = couple
      weeklyRent += couple
    }
  }

  if (parkingSelected) {
    const parking = parseAudAmount(property.parking_surcharge_per_week) ?? 0
    if (parking > 0) {
      breakdownAud.parking = parking
      weeklyRent += parking
    }
  }

  weeklyRent = Math.round(weeklyRent * 100) / 100

  const breakdownCents: RentBreakdownCents = {
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

export function propertyHasVariableOccupancyPricing(property: OccupancyPricingProperty): boolean {
  const couple = parseAudAmount(property.couple_surcharge_per_week)
  const parking = parseAudAmount(property.parking_surcharge_per_week)
  return (
    (couple != null && couple > 0) ||
    (parking != null && parking > 0 && Boolean(property.parking_available))
  )
}

/** Max possible weekly rent for bond helper copy (base + surcharges if all offered). */
export function maxWeeklyRentForProperty(property: OccupancyPricingProperty): number {
  return resolveWeeklyRent(property, {
    occupantCount: parseMaxOccupants(property.max_occupants, 1),
    parkingSelected: Boolean(property.parking_available),
  }).weeklyRent
}
