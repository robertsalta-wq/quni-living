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

export type ShareListingResult = 'shared' | 'copied' | 'prompted' | 'aborted' | 'noop'

/** Web Share API when available; otherwise clipboard / prompt fallback. */
export async function shareListing(args: {
  slug: string
  title: string
  subtitle?: string
}): Promise<ShareListingResult> {
  const slug = args.slug.trim()
  if (!slug) return 'noop'

  const url = listingShareUrl(slug)
  const text = listingShareText(args.title, args.subtitle)
  const payload = { title: args.title.trim() || 'Quni Living listing', text, url }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(payload)
      return 'shared'
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'aborted'
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    /* fall through */
  }

  window.prompt('Copy this link:', url)
  return 'prompted'
}
