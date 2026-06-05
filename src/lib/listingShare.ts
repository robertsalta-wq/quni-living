import { absoluteUrl } from './site'

/** Canonical public path for a listing (matches SEO canonical). */
export function listingPublicPath(slug: string): string {
  const trimmed = slug.trim()
  return `/listings/${encodeURIComponent(trimmed)}`
}

export function listingShareUrl(slug: string): string {
  return absoluteUrl(listingPublicPath(slug))
}

export function listingShareText(title: string, subtitle?: string): string {
  const t = title.trim()
  const s = subtitle?.trim()
  if (t && s) return `${t} - ${s}`
  return t || 'Student accommodation on Quni Living'
}
