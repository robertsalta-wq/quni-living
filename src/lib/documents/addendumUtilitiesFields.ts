import { featureNamesFromPropertyRow } from '../propertyFeatureSignals.js'
import {
  propertyUtilitiesInputFromPropertyRow,
  resolvePropertyUtilities,
} from '../propertyUtilitiesResolver.js'

export type AddendumUtilitiesFields = {
  serviceTier: 'listing' | 'managed'
  utilitiesDescription: string
  allInclusive: boolean
  billsIncluded: boolean
  listingDisclosureLabels: string[]
  /** Null for Listing; Managed uses pricing snapshot (may be 0). */
  utilitiesCap: number | null
}

const FALLBACK_UTILITIES_DESCRIPTION =
  'Electricity, gas, water, internet and waste services as agreed between the parties and as described on the property listing where applicable.'

/**
 * Resolve addendum Section 5 inputs from property utilities + booking tier.
 * Cap is only loaded from Managed pricing when `serviceTier === 'managed'`.
 */
export function buildAddendumUtilitiesFields(args: {
  serviceTier: 'listing' | 'managed'
  prop: Record<string, unknown>
  /** Raw `utilities_cap_aud` from Managed pricing snapshot; ignored for Listing. */
  managedUtilitiesCapAud?: number | null
}): AddendumUtilitiesFields {
  const serviceTier = args.serviceTier === 'managed' ? 'managed' : 'listing'
  const featureNames = featureNamesFromPropertyRow(
    args.prop as Parameters<typeof featureNamesFromPropertyRow>[0],
  )
  const resolution = resolvePropertyUtilities(
    propertyUtilitiesInputFromPropertyRow(args.prop, featureNames),
  )

  let utilitiesCap: number | null = null
  if (serviceTier === 'managed') {
    const rawCap = Number(args.managedUtilitiesCapAud ?? 0)
    utilitiesCap = Number.isFinite(rawCap) && rawCap >= 0 ? rawCap : 0
  }

  return {
    serviceTier,
    utilitiesDescription: resolution.utilitiesDescription.trim() || FALLBACK_UTILITIES_DESCRIPTION,
    allInclusive: resolution.allInclusive,
    billsIncluded: resolution.billsIncluded,
    listingDisclosureLabels: resolution.listingDisclosureLabels,
    utilitiesCap,
  }
}
