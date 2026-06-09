import { featureNamesFromPropertyRow } from './propertyFeatureSignals.js'
import {
  propertyUtilitiesInputFromPropertyRow,
  resolvePropertyUtilities,
} from './propertyUtilitiesResolver.js'

export type PropertyUtilitiesDisclosureSource = {
  property_features?: { features?: { name?: string | null } | null }[] | null
  water_usage_charged_separately?: boolean | null
  electricity_embedded_network?: boolean | null
  gas_embedded_network?: boolean | null
  water_separately_metered_efficient_attested_at?: string | null
  utilities_services?: unknown
}

/** Quick-bar / highlight labels from canonical utilities resolver (excludes generic "Bills included"). */
export function propertyUtilitiesDisclosureLabels(property: PropertyUtilitiesDisclosureSource): string[] {
  const featureNames = featureNamesFromPropertyRow(property)
  const input = propertyUtilitiesInputFromPropertyRow(property as Record<string, unknown>, featureNames)
  const resolution = resolvePropertyUtilities(input)
  return resolution.listingDisclosureLabels.filter((label) => label !== 'Bills included')
}

export function propertyUtilitiesQuickBarItems(
  property: PropertyUtilitiesDisclosureSource,
): { icon: string; text: string }[] {
  const labels = propertyUtilitiesDisclosureLabels(property)
  return labels.map((text) => {
    const lower = text.toLowerCase()
    const icon =
      lower.includes('water') ? '💧'
      : lower.includes('electricity') ? '⚡'
      : lower.includes('gas') ? '🔥'
      : lower.includes('metered') ? '📊'
      : '💡'
    return { icon, text }
  })
}
