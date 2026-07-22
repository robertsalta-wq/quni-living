import articleCanLandlordRefuseInternationalStudents from '../../../content/guides/can-a-landlord-refuse-international-students-australia/article.md?raw'
import { guideSeo as seoCanLandlordRefuseInternationalStudents } from '../../../content/guides/can-a-landlord-refuse-international-students-australia/seo.ts'
import articleBookingAPlaceYouHaventVisited from '../../../content/guides/booking-a-place-you-havent-visited/article.md?raw'
import { guideSeo as seoBookingAPlaceYouHaventVisited } from '../../../content/guides/booking-a-place-you-havent-visited/seo.ts'
import articleListingForRentersWhoCantVisit from '../../../content/guides/listing-for-renters-who-cant-visit/article.md?raw'
import { guideSeo as seoListingForRentersWhoCantVisit } from '../../../content/guides/listing-for-renters-who-cant-visit/seo.ts'
import type { GuideEntry } from './types'

export type { GuideNavItem } from './nav'
export { listGuideNavItems } from './nav'

const GUIDE_BY_SLUG: Record<string, GuideEntry> = {
  [seoCanLandlordRefuseInternationalStudents.slug]: {
    seo: seoCanLandlordRefuseInternationalStudents,
    articleMarkdown: articleCanLandlordRefuseInternationalStudents,
  },
  [seoBookingAPlaceYouHaventVisited.slug]: {
    seo: seoBookingAPlaceYouHaventVisited,
    articleMarkdown: articleBookingAPlaceYouHaventVisited,
  },
  [seoListingForRentersWhoCantVisit.slug]: {
    seo: seoListingForRentersWhoCantVisit,
    articleMarkdown: articleListingForRentersWhoCantVisit,
  },
}

export function getGuideBySlug(slug: string): GuideEntry | undefined {
  return GUIDE_BY_SLUG[slug]
}

export function listGuideSlugs(): string[] {
  return Object.keys(GUIDE_BY_SLUG)
}
