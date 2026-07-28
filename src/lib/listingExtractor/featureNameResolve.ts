/** Resolve extractor feature names → feature UUIDs (case-insensitive). */

export type FeatureRowPick = { id: string; name: string }

export type FeatureNameResolveResult = {
  matchedIds: string[]
  matchedNames: string[]
  unmatchedNames: string[]
}

export function resolveFeatureNamesToIds(
  names: string[],
  features: FeatureRowPick[],
): FeatureNameResolveResult {
  const byLower = new Map<string, FeatureRowPick>()
  for (const f of features) {
    byLower.set(f.name.trim().toLowerCase(), f)
  }
  const matchedIds: string[] = []
  const matchedNames: string[] = []
  const unmatchedNames: string[] = []
  const seenIds = new Set<string>()

  for (const name of names) {
    const key = name.trim().toLowerCase()
    if (!key) continue
    const row = byLower.get(key)
    if (!row) {
      if (!unmatchedNames.some((u) => u.toLowerCase() === key)) unmatchedNames.push(name.trim())
      continue
    }
    if (seenIds.has(row.id)) continue
    seenIds.add(row.id)
    matchedIds.push(row.id)
    matchedNames.push(row.name)
  }

  return { matchedIds, matchedNames, unmatchedNames }
}
