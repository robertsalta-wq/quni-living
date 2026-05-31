import { resolvePublicSiteUrl } from './messaging/siteUrl.js'

const SITE_NAME = 'Quni Living'
const DEFAULT_OG_IMAGE_ALT = 'Quni — verified rooms near Australian universities'

const ROOM_TYPE_LABELS: Record<string, string> = {
  single: 'Single room',
  shared: 'Shared room',
  studio: 'Studio',
  apartment: 'Apartment',
  house: 'House',
}

export type ListingOgMeta = {
  title: string
  fullTitle: string
  description: string
  image: string
  imageAlt: string
  canonicalPath: string
  canonicalUrl: string
}

type PropertyOgRow = {
  title: string | null
  suburb: string | null
  state: string | null
  images: string[] | null
  rent_per_week: number | string | null
  couple_surcharge_per_week: number | string | null
  parking_surcharge_per_week: number | string | null
  parking_available: boolean | null
  room_type: string | null
  status: string | null
  universities: { name: string | null } | { name: string | null }[] | null
  campuses: { name: string | null } | { name: string | null }[] | null
}

function parseAud(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0
}

function embedName(
  rel: PropertyOgRow['universities'] | PropertyOgRow['campuses'],
): string | null {
  if (!rel) return null
  const row = Array.isArray(rel) ? rel[0] : rel
  const name = row?.name?.trim()
  return name || null
}

function campusDisplay(row: PropertyOgRow): string | null {
  const uniName = embedName(row.universities)
  const campusName = embedName(row.campuses)
  if (uniName && campusName) return `${uniName} – ${campusName}`
  return uniName ?? campusName ?? null
}

function roomLabel(roomType: string | null | undefined): string | null {
  const rt = (roomType ?? '').trim()
  return rt ? ROOM_TYPE_LABELS[rt] ?? null : null
}

function parsePropertyImageEntry(entry: string): string | null {
  const t = entry.trim()
  if (!t) return null
  if (t.startsWith('{')) {
    try {
      const o = JSON.parse(t) as { url?: unknown }
      if (typeof o.url === 'string' && o.url.trim()) return o.url.trim()
    } catch {
      /* legacy / malformed */
    }
  }
  if (/^https?:\/\//i.test(t)) return t
  return null
}

function firstPropertyImageUrl(images: string[] | null | undefined): string | null {
  if (!images?.length) return null
  for (const entry of images) {
    if (typeof entry !== 'string') continue
    const url = parsePropertyImageEntry(entry)
    if (url) return url
  }
  return null
}

function hasVariableOccupancyPricing(row: PropertyOgRow): boolean {
  const couple = parseAud(row.couple_surcharge_per_week)
  const parking = parseAud(row.parking_surcharge_per_week)
  return (couple > 0) || (parking > 0 && Boolean(row.parking_available))
}

function buildDescription(row: PropertyOgRow): string {
  const title = (row.title ?? '').trim() || 'Student accommodation'
  const rent = parseAud(row.rent_per_week)
  const showFromPrefix = hasVariableOccupancyPricing(row)
  const rtLabel = roomLabel(row.room_type)
  const campus = campusDisplay(row)

  const bits: string[] = [
    title,
    `${showFromPrefix ? 'From ' : ''}$${rent.toLocaleString('en-AU', { maximumFractionDigits: 0 })}/week`,
  ]
  if (rtLabel) bits.push(rtLabel)
  if (row.suburb?.trim()) bits.push(row.suburb.trim())
  if (campus) bits.push(`Near ${campus}`)
  bits.push('Verified student accommodation on Quni Living, Australia.')

  let out = bits.filter(Boolean).join('. ')
  if (out.length > 158) out = `${out.slice(0, 155)}…`
  return out
}

function fullTitle(title: string): string {
  const t = title.trim()
  if (!t) return SITE_NAME
  if (t.toLowerCase().includes(SITE_NAME.toLowerCase())) return t
  return `${t} | ${SITE_NAME}`
}

function defaultOgImage(siteUrl: string): string {
  return `${siteUrl}/og-default.png`
}

function supabaseRestConfig(): { supabaseUrl: string; anonKey: string } | null {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const anonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim()
  if (!supabaseUrl || !anonKey) return null
  return { supabaseUrl, anonKey }
}

/** Load listing-specific Open Graph fields for social crawlers. */
export async function fetchListingOgMeta(
  slug: string,
  canonicalPath: string,
): Promise<ListingOgMeta | null> {
  const trimmedSlug = slug.trim()
  if (!trimmedSlug) return null

  const cfg = supabaseRestConfig()
  if (!cfg) return null

  const siteUrl = resolvePublicSiteUrl()
  const select = [
    'title',
    'suburb',
    'state',
    'images',
    'rent_per_week',
    'couple_surcharge_per_week',
    'parking_surcharge_per_week',
    'parking_available',
    'room_type',
    'status',
    'universities(name)',
    'campuses(name)',
  ].join(',')

  const restUrl = new URL(`${cfg.supabaseUrl.replace(/\/+$/, '')}/rest/v1/properties`)
  restUrl.searchParams.set('select', select)
  restUrl.searchParams.set('slug', `eq.${trimmedSlug}`)
  restUrl.searchParams.set('status', 'eq.active')
  restUrl.searchParams.set('limit', '1')

  const res = await fetch(restUrl.toString(), {
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${cfg.anonKey}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) return null

  const rows = (await res.json()) as PropertyOgRow[]
  const row = rows[0]
  if (!row) return null

  const title = (row.title ?? '').trim() || 'Student accommodation'
  const image = firstPropertyImageUrl(row.images)
  const ogImage = image && /^https?:\/\//i.test(image) ? image : defaultOgImage(siteUrl)
  const path = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`

  return {
    title,
    fullTitle: fullTitle(title),
    description: buildDescription(row),
    image: ogImage,
    imageAlt: title || DEFAULT_OG_IMAGE_ALT,
    canonicalPath: path,
    canonicalUrl: `${siteUrl}${path}`,
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildListingOgHtml(meta: ListingOgMeta): string {
  const title = escapeHtml(meta.fullTitle)
  const description = escapeHtml(meta.description)
  const canonicalUrl = escapeHtml(meta.canonicalUrl)
  const image = escapeHtml(meta.image)
  const imageAlt = escapeHtml(meta.imageAlt)
  const siteName = escapeHtml(SITE_NAME)
  const redirectPath = escapeHtml(meta.canonicalPath)

  return `<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${siteName}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:locale" content="en_AU" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${imageAlt}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <meta http-equiv="refresh" content="0;url=${redirectPath}" />
  </head>
  <body>
    <p><a href="${redirectPath}">View listing on Quni Living</a></p>
  </body>
</html>`
}
