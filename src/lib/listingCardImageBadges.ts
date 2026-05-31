import {
  listingInclusionSummaryLabels,
  resolvePropertyInclusionSignals,
} from './propertyInclusionSignals'

export type ListingCardImageBadge = {
  id: string
  label: string
  variant: 'featured' | 'inclusion'
}

type BadgeSource = {
  featured?: boolean | null
  furnished?: boolean | null
  linen_supplied?: boolean | null
  weekly_cleaning_service?: boolean | null
  parking_available?: boolean | null
  property_features?: { features?: { name?: string | null } | null }[] | null
}

/** Photo overlay badges — aligned with PropertyDetail hero (Featured, Furnished, Linen, Weekly, Bills). */
export function buildListingCardImageBadges(property: BadgeSource): ListingCardImageBadge[] {
  const badges: ListingCardImageBadge[] = []
  if (property.featured) {
    badges.push({ id: 'featured', label: 'Featured', variant: 'featured' })
  }
  const signals = resolvePropertyInclusionSignals(property)
  for (const label of listingInclusionSummaryLabels(signals)) {
    badges.push({
      id: label.toLowerCase().replace(/\s+/g, '-'),
      label,
      variant: 'inclusion',
    })
  }
  return badges
}

/** Same mobile cap as listing detail: Featured + up to two inclusion badges on small screens. */
export function listingCardBadgeVisibleOnMobile(
  badges: ListingCardImageBadge[],
  badgeId: string,
): boolean {
  const badge = badges.find((b) => b.id === badgeId)
  if (!badge) return false
  if (badge.variant === 'featured') return true
  const inclusions = badges.filter((b) => b.variant === 'inclusion')
  const idx = inclusions.findIndex((b) => b.id === badgeId)
  return idx >= 0 && idx < 2
}
