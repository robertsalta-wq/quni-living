import articleCanLandlordRefuseInternationalStudents from '../../../content/guides/can-a-landlord-refuse-international-students-australia/article.md?raw'
import { guideSeo as seoCanLandlordRefuseInternationalStudents } from '../../../content/guides/can-a-landlord-refuse-international-students-australia/seo.ts'
import type { GuideEntry } from './types'

const GUIDE_BY_SLUG: Record<string, GuideEntry> = {
  [seoCanLandlordRefuseInternationalStudents.slug]: {
    seo: seoCanLandlordRefuseInternationalStudents,
    articleMarkdown: articleCanLandlordRefuseInternationalStudents,
  },
}

export function getGuideBySlug(slug: string): GuideEntry | undefined {
  return GUIDE_BY_SLUG[slug]
}

export function listGuideSlugs(): string[] {
  return Object.keys(GUIDE_BY_SLUG)
}
