export type GuideFaqItem = {
  question: string
  answer: string
}

export type GuideSeoConfig = {
  slug: string
  /** Document `<title>` and OG/Twitter title (Seo may append site name). */
  title: string
  /** Single on-page H1 in the hero band. */
  headline: string
  /** Meta description and JSON-LD description. */
  metaDescription: string
  /** OG/Twitter description when it differs from meta (e.g. product-scoped social copy). */
  ogDescription?: string
  /** BlogPosting headline when it differs from the on-page H1. */
  jsonLdHeadline?: string
  /** ISO date YYYY-MM-DD — set at deploy. */
  datePublished: string
  /** ISO date YYYY-MM-DD — set at deploy. */
  dateModified: string
  /** Optional absolute OG/Twitter image; falls back to DEFAULT_OG_IMAGE. */
  ogImage?: string
  /** Optional shorter label for header/footer nav menus. */
  navLabel?: string
  /** Optional FAQ pairs for on-page section and FAQPage JSON-LD. */
  faqs?: GuideFaqItem[]
}

export type GuideEntry = {
  seo: GuideSeoConfig
  articleMarkdown: string
}

export type GuideManifestEntry = {
  slug: string
  dateModified: string
}
