import { buildListingPhotoBadges, type ListingHighlightSource } from './listingDisplayHighlights'

export type ListingCardImageBadge = {
  id: string
  label: string
  variant: 'featured' | 'inclusion'
}

/** Photo overlay badges: featured + inclusions only. */
export function buildListingCardImageBadges(property: ListingHighlightSource): ListingCardImageBadge[] {
  return buildListingPhotoBadges(property)
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
