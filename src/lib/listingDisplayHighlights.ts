import {
  listingInclusionSummaryLabels,
  resolvePropertyInclusionSignals,
  type PropertyInclusionSignals,
} from './propertyInclusionSignals'

function featureDisplayNamesFromPropertyRow(property: ListingHighlightSource): string[] {
  const raw = property.property_features
  if (!Array.isArray(raw)) return []
  return raw
    .map((pf) => {
      const n = pf?.features?.name
      return typeof n === 'string' ? n.trim() : ''
    })
    .filter(Boolean)
}

export type ListingHighlightSource = {
  featured?: boolean | null
  furnished?: boolean | null
  linen_supplied?: boolean | null
  weekly_cleaning_service?: boolean | null
  parking_available?: boolean | null
  property_features?: { features?: { name?: string | null } | null }[] | null
}

function normLabel(label: string): string {
  return label.trim().toLowerCase()
}

/** Inclusion-only labels (furnished, linen, cleaning, bills, parking). */
export function buildListingInclusionLabels(property: ListingHighlightSource): string[] {
  return listingInclusionSummaryLabels(resolvePropertyInclusionSignals(property))
}

/** All inclusion + feature labels for detail amenities (deduped, stable order). */
export function buildListingHighlightLabels(property: ListingHighlightSource): string[] {
  const signals = resolvePropertyInclusionSignals(property)
  const out: string[] = []
  const seen = new Set<string>()

  const add = (label: string) => {
    const trimmed = label.trim()
    if (!trimmed) return
    const key = normLabel(trimmed)
    if (seen.has(key)) return
    seen.add(key)
    out.push(trimmed)
  }

  for (const label of listingInclusionSummaryLabels(signals)) {
    add(label)
  }

  for (const name of featureDisplayNamesFromPropertyRow(property)) {
    add(name)
  }

  return out
}

export function listingHighlightSignals(property: ListingHighlightSource): PropertyInclusionSignals {
  return resolvePropertyInclusionSignals(property)
}

/** Photo overlays: featured + inclusions only (never amenity features). */
export function buildListingPhotoBadges(
  property: ListingHighlightSource,
): { id: string; label: string; variant: 'featured' | 'inclusion' }[] {
  const badges: { id: string; label: string; variant: 'featured' | 'inclusion' }[] = []
  if (property.featured) {
    badges.push({ id: 'featured', label: 'Featured', variant: 'featured' })
  }
  for (const label of buildListingInclusionLabels(property)) {
    badges.push({
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      label,
      variant: 'inclusion',
    })
  }
  return badges
}
