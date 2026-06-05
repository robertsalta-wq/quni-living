export type GuideSeoConfig = {
  slug: string
  /** Document `<title>` and OG/Twitter title (Seo may append site name). */
  title: string
  /** Single on-page H1 in the hero band. */
  headline: string
  metaDescription: string
  /** ISO date YYYY-MM-DD — set at deploy. */
  datePublished: string
  /** ISO date YYYY-MM-DD — set at deploy. */
  dateModified: string
  /** Optional absolute OG/Twitter image; falls back to DEFAULT_OG_IMAGE. */
  ogImage?: string
}

export type GuideEntry = {
  seo: GuideSeoConfig
  articleMarkdown: string
}

export type GuideManifestEntry = {
  slug: string
  dateModified: string
}
