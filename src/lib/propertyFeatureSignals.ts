/** Derive listing signals from feature names (same heuristics as PropertyDetail). */

const CLIMATE_FEATURE_ORDER = ['air conditioning', 'ceiling fan'] as const

function climateFeatureRank(name: string): number {
  const n = name.trim().toLowerCase()
  return (CLIMATE_FEATURE_ORDER as readonly string[]).indexOf(n)
}

/** Ceiling fan sits immediately after Air conditioning; everything else stays A-Z. */
export function comparePropertyFeatureNames(a: string, b: string): number {
  const ia = climateFeatureRank(a)
  const ib = climateFeatureRank(b)
  if (ia !== -1 && ib !== -1) return ia - ib
  const aKey = ia !== -1 ? 'air conditioning' : a.trim().toLowerCase()
  const bKey = ib !== -1 ? 'air conditioning' : b.trim().toLowerCase()
  const byAlpha = aKey.localeCompare(bKey, 'en')
  if (byAlpha !== 0) return byAlpha
  return (ia === -1 ? 1 : ia) - (ib === -1 ? 1 : ib)
}

export function sortPropertyFeatureRows<T extends { name: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => comparePropertyFeatureNames(a.name, b.name))
}

export function featureNamesFromPropertyRow(property: {
  property_features?: { features?: { name?: string | null } | null }[] | null
} | null): string[] {
  const raw = property?.property_features
  if (!Array.isArray(raw)) return []
  return raw
    .map((pf) => {
      const n = pf?.features?.name
      return typeof n === 'string' ? n.trim().toLowerCase() : ''
    })
    .filter(Boolean)
}

export function propertyBillsIncluded(names: string[]): boolean {
  return names.some((n) => /bills?\s*included|^utilities$/i.test(n))
}

export function propertyPetsAllowed(names: string[]): boolean {
  return names.some((n) => /pet|pets|cat|dog/i.test(n))
}

export function propertyHasParking(names: string[]): boolean {
  return names.some((n) => /parking|car\s*space|car\s*park|garage/i.test(n))
}
