import { absoluteUrl, DEFAULT_OG_IMAGE, ORGANIZATION_EMAIL, SITE_NAME, SITE_URL } from '../site'
import type { GuideSeoConfig } from './types'

export function buildGuideBlogPostingJsonLd(
  seo: GuideSeoConfig,
  opts?: { image?: string },
): Record<string, unknown> {
  const path = `/guides/${seo.slug}`
  const url = absoluteUrl(path)
  const image = opts?.image ?? DEFAULT_OG_IMAGE

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: seo.headline,
    description: seo.metaDescription,
    url,
    datePublished: seo.datePublished,
    dateModified: seo.dateModified,
    inLanguage: 'en-AU',
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      email: ORGANIZATION_EMAIL,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/favicon.png'),
      },
    },
    image,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  }
}

/** Reserved for follow-up: merge FAQPage JSON-LD alongside BlogPosting. */
export function buildGuidePageJsonLd(
  seo: GuideSeoConfig,
  opts?: { image?: string },
): Record<string, unknown>[] {
  return [buildGuideBlogPostingJsonLd(seo, opts)]
}
