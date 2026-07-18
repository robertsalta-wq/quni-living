import { matchPath } from 'react-router-dom'
import {
  LISTING_HUB_SECTION_IDS,
  LISTING_HUB_SECTIONS,
  type ListingHubSectionId,
} from './listingEditHubHealth'

function formAnchorForHubSection(sectionId: ListingHubSectionId | 'basic'): string {
  if (sectionId === 'basic') {
    return LISTING_HUB_SECTIONS.find((s) => s.id === 'basic')?.formSectionIds[0] ?? 'section-basic-info'
  }
  const meta = LISTING_HUB_SECTIONS.find((s) => s.id === sectionId)
  return meta?.formSectionIds[0] ?? `section-${sectionId}`
}

/**
 * Desktop (≥ sm) should not show hub nested routes — redirect to the long form
 * base URL with a section hash. Returns null when no redirect is needed.
 */
export function resolveListingEditDesktopRedirect(pathname: string): string | null {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`

  const newBasic = matchPath({ path: '/landlord/property/new/basic', end: true }, p)
  if (newBasic) return `/landlord/property/new#${formAnchorForHubSection('basic')}`

  const newSection = matchPath({ path: '/landlord/property/new/section/:sectionId', end: true }, p)
  if (newSection?.params.sectionId) {
    const raw = newSection.params.sectionId
    if ((LISTING_HUB_SECTION_IDS as readonly string[]).includes(raw)) {
      return `/landlord/property/new#${formAnchorForHubSection(raw as ListingHubSectionId)}`
    }
    return '/landlord/property/new'
  }

  const editBasic = matchPath({ path: '/landlord/property/edit/:id/basic', end: true }, p)
  if (editBasic?.params.id) {
    return `/landlord/property/edit/${editBasic.params.id}#${formAnchorForHubSection('basic')}`
  }

  const editSection = matchPath(
    { path: '/landlord/property/edit/:id/section/:sectionId', end: true },
    p,
  )
  if (editSection?.params.id && editSection.params.sectionId) {
    const raw = editSection.params.sectionId
    if ((LISTING_HUB_SECTION_IDS as readonly string[]).includes(raw)) {
      return `/landlord/property/edit/${editSection.params.id}#${formAnchorForHubSection(
        raw as ListingHubSectionId,
      )}`
    }
    return `/landlord/property/edit/${editSection.params.id}`
  }

  return null
}

export function isListingEditSectionPath(pathname: string): boolean {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`
  return Boolean(
    matchPath({ path: '/landlord/property/new/section/:sectionId', end: true }, p) ||
      matchPath({ path: '/landlord/property/edit/:id/section/:sectionId', end: true }, p),
  )
}
