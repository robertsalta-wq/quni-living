import { listingHubPath, type ListingHubSectionId } from './listingEditHubHealth'
import { normalizePropertyImages } from './propertyImages'

/** Fields the listings tile already has (or can load) before a draft goes live. */
export type DraftTilePublishFields = {
  id: string
  title: string | null
  rent_per_week: number | null
  address: string | null
  suburb: string | null
  state: string | null
  /** Undefined on a stale dashboard cache that predates this field. Null means missing. */
  postcode?: string | null
  images: unknown
  property_type: string | null
  room_type: string | null
  is_registered_rooming_house: boolean | null
}

export type DraftTilePublishGap = {
  message: string
  section: ListingHubSectionId
  href: string
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim())
}

function photoCount(images: unknown): number {
  if (!Array.isArray(images)) return 0
  const urls = images.filter((entry): entry is string => typeof entry === 'string')
  return normalizePropertyImages(urls).length
}

/**
 * Minimum for publishing from the listings tile or the preview Publish button.
 * Quality nudges (extra photos, long description, inclusions, house rules) stay optional.
 * Returns the first gap so the landlord lands on the section that blocks going live.
 */
export function draftTilePublishGap(listing: DraftTilePublishFields): DraftTilePublishGap | null {
  const hasType =
    hasText(listing.property_type) ||
    hasText(listing.room_type) ||
    listing.is_registered_rooming_house === true
  const basicOk = hasText(listing.title) && hasType

  const postcodeKnown = listing.postcode !== undefined
  const addressOk =
    hasText(listing.address) &&
    hasText(listing.suburb) &&
    hasText(listing.state) &&
    (!postcodeKnown || hasText(listing.postcode))

  const rent = Number(listing.rent_per_week)
  const rentOk = Number.isFinite(rent) && rent > 0
  const photosOk = photoCount(listing.images) > 0

  let section: ListingHubSectionId | null = null
  if (!basicOk) section = 'basic'
  else if (!addressOk) section = 'location'
  else if (!rentOk) section = 'pricing'
  else if (!photosOk) section = 'photos'

  if (!section) return null

  const message =
    section === 'basic'
      ? 'Add a title and listing type before this can go live.'
      : section === 'location'
        ? 'Add the full address before this can go live.'
        : section === 'pricing'
          ? 'Add weekly rent before this can go live.'
          : 'Add at least one photo before this can go live.'

  return {
    message,
    section,
    href: listingHubPath({ propertyId: listing.id, view: section }),
  }
}
