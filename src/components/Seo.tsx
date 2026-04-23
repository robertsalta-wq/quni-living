import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import {
  SITE_NAME,
  SITE_URL,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
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

  const ldBlocks = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : []

  return (
    <Helmet prioritizeSeoTags>
      <html lang="en-AU" />
      <title>{fullTitle(title)}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />
      <meta name="theme-color" content="#FF6F61" />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle(title)} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content="en_AU" />
      {image ? <meta property="og:image" content={image} /> : null}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle(title)} />
      <meta name="twitter:description" content={description} />
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
