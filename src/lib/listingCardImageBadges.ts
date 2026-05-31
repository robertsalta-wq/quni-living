import {
  buildListingInclusionLabels,
  buildListingPhotoBadges,
  type ListingHighlightSource,
} from './listingDisplayHighlights'

export type ListingCardImageBadge = {
  id: string
  label: string
  variant: 'featured' | 'inclusion'
}

/** Max badges on listing grid photos (Featured counts toward this). Detail page is uncapped. */
export const LISTING_CARD_PHOTO_BADGE_MAX = 2

export type ListingCardBadgeDisplay = {
  photoBadges: ListingCardImageBadge[]
  /** Inclusions that did not fit on the photo — show in card body. */
  extraInclusionLabels: string[]
}

export function buildListingCardBadgeDisplay(
  property: ListingHighlightSource,
): ListingCardBadgeDisplay {
  const all = buildListingPhotoBadges(property)
  const photoBadges = all.slice(0, LISTING_CARD_PHOTO_BADGE_MAX)
  const onPhoto = new Set(
    photoBadges.filter((b) => b.variant === 'inclusion').map((b) => b.label.trim().toLowerCase()),
  )
  const extraInclusionLabels = buildListingInclusionLabels(property).filter(
    (label) => !onPhoto.has(label.trim().toLowerCase()),
  )
  return { photoBadges, extraInclusionLabels }
}

/** @deprecated Prefer buildListingCardBadgeDisplay */
export function buildListingCardImageBadges(property: ListingHighlightSource): ListingCardImageBadge[] {
  return buildListingCardBadgeDisplay(property).photoBadges
}
