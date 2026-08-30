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

/** Same current/total as the listing drill-in header "Step X of Y". */
export function listingHubWizardStepProgress(
  sectionId: ListingHubSectionId | null | undefined,
): { current: number; total: number } {
  const total = LISTING_HUB_SECTION_IDS.length
  if (!sectionId) return { current: 1, total }
  const i = LISTING_HUB_SECTION_IDS.indexOf(sectionId)
  return { current: i >= 0 ? i + 1 : 1, total }
}

export function listingHubWizardStepCaption(progress: { current: number; total: number }): string {
  return `Step ${progress.current} of ${progress.total}`
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

/** Field to reveal when a step gate fails. */
export function listingHubWizardStepFocusId(sectionId: ListingHubSectionId): string | null {
  if (sectionId === 'basic') return 'pf-title'
  if (sectionId === 'pricing') return 'pf-rent'
  return null
}

const LISTING_WIZARD_RESUME_KEY = 'quni.listingWizard.resume.v1'

function listingWizardStorage(): Storage | null {
  try {
    if (typeof sessionStorage === 'undefined') return null
    return sessionStorage
  } catch {
    return null
  }
}

export function listingWizardResumeStorageKey(propertyId: string | null): string {
  return `${LISTING_WIZARD_RESUME_KEY}:${propertyId ?? 'new'}`
}

export function writeListingWizardResume(
  propertyId: string | null,
  sectionId: ListingHubSectionId,
): void {
  listingWizardStorage()?.setItem(listingWizardResumeStorageKey(propertyId), sectionId)
}

export function readListingWizardResume(propertyId: string | null): ListingHubSectionId | null {
  const raw = listingWizardStorage()?.getItem(listingWizardResumeStorageKey(propertyId))
  if (raw && (LISTING_HUB_SECTION_IDS as readonly string[]).includes(raw)) {
    return raw as ListingHubSectionId
  }
  return null
}

export function clearListingWizardResume(propertyId: string | null): void {
  listingWizardStorage()?.removeItem(listingWizardResumeStorageKey(propertyId))
}
