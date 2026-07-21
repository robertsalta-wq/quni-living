import { guideSeo as seoCanLandlordRefuseInternationalStudents } from '../../../content/guides/can-a-landlord-refuse-international-students-australia/seo.ts'

/** Lightweight guide links for chrome (Footer) — SEO metadata only, no article markdown. */
export type GuideNavItem = {
  to: string
  label: string
}

const GUIDE_NAV_SEO = [seoCanLandlordRefuseInternationalStudents] as const

export function listGuideNavItems(): GuideNavItem[] {
  return GUIDE_NAV_SEO.map((seo) => ({
    to: `/guides/${seo.slug}`,
    label: seo.navLabel ?? seo.headline,
  }))
}
