import { guideSeo as seoCanLandlordRefuseInternationalStudents } from '../../../content/guides/can-a-landlord-refuse-international-students-australia/seo.ts'
import { guideSeo as seoBookingAPlaceYouHaventVisited } from '../../../content/guides/booking-a-place-you-havent-visited/seo.ts'
import { guideSeo as seoListingForRentersWhoCantVisit } from '../../../content/guides/listing-for-renters-who-cant-visit/seo.ts'

/** Lightweight guide links for chrome (Footer) — SEO metadata only, no article markdown. */
export type GuideNavItem = {
  to: string
  label: string
}

const GUIDE_NAV_SEO = [
  seoCanLandlordRefuseInternationalStudents,
  seoBookingAPlaceYouHaventVisited,
  seoListingForRentersWhoCantVisit,
] as const

export function listGuideNavItems(): GuideNavItem[] {
  return GUIDE_NAV_SEO.map((seo) => ({
    to: `/guides/${seo.slug}`,
    label: seo.navLabel ?? seo.headline,
  }))
}
