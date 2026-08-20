/** Derive listing signals from feature names (same heuristics as PropertyDetail). */

/** Sort key so Ceiling fan sits with Air conditioning / Heating (A-Z otherwise). */
function propertyFeatureSortKey(name: string): string {
  const n = name.trim().toLowerCase()
  if (n === 'ceiling fan') return 'air conditioning\u0001'
  return n
}

export function comparePropertyFeatureNames(a: string, b: string): number {
  return propertyFeatureSortKey(a).localeCompare(propertyFeatureSortKey(b), 'en')
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
