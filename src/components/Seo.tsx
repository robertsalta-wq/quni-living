import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import {
  SITE_NAME,
  SITE_URL,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
} from '../lib/site'

export type SeoProps = {
  title: string
  description?: string
  /**
   * Path + optional query (e.g. `/listings` or `/listings?q=studio`).
   * Omit to use the current location (self-referencing canonical).
   */
  canonicalPath?: string
  /** Absolute URL for og:image / twitter:image */
  image?: string
  imageAlt?: string
  ogType?: 'website' | 'article'
  /** OG/Twitter description; falls back to `description`. */
  ogDescription?: string
  /** ISO date (YYYY-MM-DD) for article Open Graph tags */
  articlePublishedTime?: string
  articleModifiedTime?: string
  noindex?: boolean
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

function fullTitle(title: string): string {
  const t = title.trim()
  if (!t) return SITE_NAME
  if (t.toLowerCase().includes(SITE_NAME.toLowerCase())) return t
  return `${t} | ${SITE_NAME}`
}

export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath,
  image = DEFAULT_OG_IMAGE,
  imageAlt = DEFAULT_OG_IMAGE_ALT,
  ogType = 'website',
  ogDescription,
  articlePublishedTime,
  articleModifiedTime,
  noindex = false,
  jsonLd,
}: SeoProps) {
  const { pathname, search } = useLocation()
  const pathPart =
    canonicalPath !== undefined
      ? canonicalPath.startsWith('/')
        ? canonicalPath
        : `/${canonicalPath}`
      : `${pathname}${search}`
  const canonical = `${SITE_URL}${pathPart}`

  const robots = noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
  const socialDescription = ogDescription ?? description

  const ldBlocks = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : []

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle(title)}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />
      <meta name="theme-color" content="#FF6F61" />

      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle(title)} />
      <meta property="og:description" content={socialDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content="en_AU" />
      {ogType === 'article' && articlePublishedTime ? (
        <meta property="article:published_time" content={articlePublishedTime} />
      ) : null}
      {ogType === 'article' && articleModifiedTime ? (
        <meta property="article:modified_time" content={articleModifiedTime} />
      ) : null}
      {image ? <meta property="og:image" content={image} /> : null}
      {image ? <meta property="og:image:width" content="1200" /> : null}
      {image ? <meta property="og:image:height" content="630" /> : null}
      {image ? <meta property="og:image:alt" content={imageAlt} /> : null}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle(title)} />
      <meta name="twitter:description" content={socialDescription} />
      {image ? <meta name="twitter:image" content={image} /> : null}

      {ldBlocks.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </Helmet>
  )
}
