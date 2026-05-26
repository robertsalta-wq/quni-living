import {
  maxWeeklyRentForProperty,
  propertyHasVariableOccupancyPricing,
  type OccupancyPricingProperty,
} from './resolveWeeklyRent'

function formatAud(amount: number): string {
  return amount.toLocaleString('en-AU', { maximumFractionDigits: 0 })
}

function parseAud(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0
}

/** One-line breakdown for cards and listing detail, e.g. "$400 (1 person) · +$100 second person". */
export function formatOccupancyPricingBreakdown(property: OccupancyPricingProperty): string | null {
  if (!propertyHasVariableOccupancyPricing(property)) return null

  const base = parseAud(property.rent_per_week)
  const parts: string[] = [`$${formatAud(base)} (1 person)`]

  const maxOcc = Math.min(10, Math.max(1, Math.floor(Number(property.max_occupants) || 1)))
  const couple = parseAud(property.couple_surcharge_per_week)
  if (maxOcc >= 2 && couple > 0) {
    parts.push(`+$${formatAud(couple)} second person`)
  }

  const parking = parseAud(property.parking_surcharge_per_week)
  if (property.parking_available && parking > 0) {
    parts.push(`+$${formatAud(parking)} carpark`)
  }

  return parts.join(' · ')
}

export type ListingRentDisplay = {
  primaryAmount: number
  showFromPrefix: boolean
  breakdownLine: string | null
  maxWeeklyRent: number
}

export function getListingRentDisplay(property: OccupancyPricingProperty): ListingRentDisplay {
  const primaryAmount = parseAud(property.rent_per_week)
  const showFromPrefix = propertyHasVariableOccupancyPricing(property)
  return {
    primaryAmount,
    showFromPrefix,
    breakdownLine: formatOccupancyPricingBreakdown(property),
    maxWeeklyRent: showFromPrefix ? maxWeeklyRentForProperty(property) : primaryAmount,
  }
}
