import {
  LISTING_HUB_SECTION_IDS,
  listingHubPath,
  type ListingHubSectionId,
} from './listingEditHubHealth'

/** Owner-only draft preview (not the public `/properties/:slug` page). */
export function listingPreviewPath(propertyId: string): string {
  return `/landlord/property/edit/${propertyId}/preview`
}

export function isListingPreviewPath(pathname: string): boolean {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`
  return /^\/landlord\/property\/edit\/[^/]+\/preview\/?$/.test(p)
}

/**
 * Hub / form Preview target.
 * Live listings open the public page. Saved drafts open the owner preview.
 */
export function listingOwnerOrPublicPreviewHref(opts: {
  propertyId: string | null
  status: string | null | undefined
  slug: string | null | undefined
}): string | null {
  if (!opts.propertyId) return null
  const slug = opts.slug?.trim()
  if (opts.status === 'active' && slug) return `/properties/${slug}`
  return listingPreviewPath(opts.propertyId)
}

export function listingHubWizardPrevHref(
  propertyId: string | null,
  sectionId: ListingHubSectionId,
): string {
  const i = LISTING_HUB_SECTION_IDS.indexOf(sectionId)
  if (i <= 0) return listingHubPath({ propertyId })
  return listingHubPath({ propertyId, view: LISTING_HUB_SECTION_IDS[i - 1] })
}

export function listingHubWizardNextHref(
  propertyId: string | null,
  sectionId: ListingHubSectionId,
  opts?: { status?: string | null; slug?: string | null },
): string {
  const i = LISTING_HUB_SECTION_IDS.indexOf(sectionId)
  if (i < 0) return listingHubPath({ propertyId })
  if (i >= LISTING_HUB_SECTION_IDS.length - 1) {
    return (
      listingOwnerOrPublicPreviewHref({
        propertyId,
        status: opts?.status,
        slug: opts?.slug,
      }) ?? listingHubPath({ propertyId })
    )
  }
  return listingHubPath({ propertyId, view: LISTING_HUB_SECTION_IDS[i + 1] })
}

/** Per-step Next gates. Rent is only required on pricing. */
export function listingHubWizardStepError(
  sectionId: ListingHubSectionId,
  input: { title?: string | null; rentPerWeek?: number | string | null },
): string | null {
  if (sectionId === 'basic' && !String(input.title ?? '').trim()) {
    return 'Add a listing title to continue.'
  }
  if (sectionId === 'pricing') {
    const rent = Number(input.rentPerWeek)
    if (!Number.isFinite(rent) || rent <= 0) {
      return 'Rent per week must be a positive number.'
    }
  }
  return null
}
