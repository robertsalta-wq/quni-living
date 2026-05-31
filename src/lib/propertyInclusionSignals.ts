import { featureNamesFromPropertyRow, propertyBillsIncluded, propertyHasParking } from './propertyFeatureSignals'

export type PropertyInclusionSignals = {
  furnished: boolean
  linenSupplied: boolean
  weeklyCleaning: boolean
  billsIncluded: boolean
  parkingAvailable: boolean
}

type InclusionSource = {
  furnished?: boolean | null
  linen_supplied?: boolean | null
  weekly_cleaning_service?: boolean | null
  parking_available?: boolean | null
  property_features?: { features?: { name?: string | null } | null }[] | null
}

/**
 * Resolved inclusion flags for display (listing cards, detail hero, quick bar).
 * Uses DB inclusion columns first, then feature names when landlords ticked amenities only.
 */
export function resolvePropertyInclusionSignals(property: InclusionSource): PropertyInclusionSignals {
  const names = featureNamesFromPropertyRow(property)
  return {
    furnished:
      property.furnished === true || names.some((n) => /furnish/i.test(n)),
    linenSupplied:
      property.linen_supplied === true || names.some((n) => /linen/i.test(n)),
    weeklyCleaning:
      property.weekly_cleaning_service === true ||
      names.some((n) => /weekly\s*clean|cleaning\s*service|housekeeping/i.test(n)),
    billsIncluded: propertyBillsIncluded(names),
    parkingAvailable: property.parking_available === true || propertyHasParking(names),
  }
}

/** Human-readable labels for summary chips (stable order). */
export function listingInclusionSummaryLabels(signals: PropertyInclusionSignals): string[] {
  const out: string[] = []
  if (signals.furnished) out.push('Furnished')
  if (signals.linenSupplied) out.push('Linen supplied')
  if (signals.weeklyCleaning) out.push('Weekly cleaning')
  if (signals.billsIncluded) out.push('Bills included')
  if (signals.parkingAvailable) out.push('Parking')
  return out
}
