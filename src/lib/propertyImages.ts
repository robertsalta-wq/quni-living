/** One listing photo with optional short caption (stored in `properties.images` text[]). */
export type PropertyImage = {
  url: string
  description?: string
}

export const MAX_PROPERTY_IMAGE_DESCRIPTION_LENGTH = 200
export const PROPERTY_IMAGES_BUCKET = 'property-images'

function parsePropertyImageEntry(entry: string): PropertyImage | null {
  const t = entry.trim()
  if (!t) return null

  if (t.startsWith('{')) {
    try {
      const o = JSON.parse(t) as { url?: unknown; description?: unknown }
      if (typeof o.url === 'string' && o.url.trim()) {
        const description =
          typeof o.description === 'string' ? o.description.trim().slice(0, MAX_PROPERTY_IMAGE_DESCRIPTION_LENGTH) : ''
        return {
          url: o.url.trim(),
          ...(description ? { description } : {}),
        }
      }
    } catch {
      /* legacy / malformed - fall through */
    }
  }

  if (/^https?:\/\//i.test(t)) return { url: t }
  return null
}

/** Parse DB `images` text[] (plain URLs and/or JSON caption objects). */
export function normalizePropertyImages(raw: string[] | null | undefined): PropertyImage[] {
  if (!raw?.length) return []
  const out: PropertyImage[] = []
  for (const entry of raw) {
    if (typeof entry !== 'string') continue
    const parsed = parsePropertyImageEntry(entry)
    if (parsed) out.push(parsed)
  }
  return out
}

/** Serialize for Supabase `images` text[] - plain URL when no caption. */
export function serializePropertyImages(images: readonly PropertyImage[]): string[] {
  return images.map(({ url, description }) => {
    const u = url.trim()
    const d = description?.trim().slice(0, MAX_PROPERTY_IMAGE_DESCRIPTION_LENGTH)
    if (d) return JSON.stringify({ url: u, description: d })
    return u
  })
}

export function propertyImageUrl(image: PropertyImage | string | null | undefined): string | null {
  if (!image) return null
  if (typeof image === 'string') return parsePropertyImageEntry(image)?.url ?? null
  return image.url.trim() || null
}

export function firstPropertyImageUrl(images: string[] | null | undefined): string | null {
  return normalizePropertyImages(images)[0]?.url ?? null
}

export function propertyImageUrls(images: readonly PropertyImage[]): string[] {
  return images.map(({ url }) => url.trim()).filter(Boolean)
}

/** Storage object path after `/property-images/` in a public URL. */
export function pathFromPropertyImageUrl(
  url: string,
  bucket: string = PROPERTY_IMAGES_BUCKET,
): string | null {
  const marker = `/${bucket}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + marker.length))
}

/** Paths safe to delete for the signed-in landlord (own folder only). */
export function storagePathsForPropertyImageUrls(
  urls: readonly string[],
  ownerUserId: string,
  bucket: string = PROPERTY_IMAGES_BUCKET,
): string[] {
  const prefix = `${ownerUserId}/`
  const paths: string[] = []
  for (const url of urls) {
    const path = pathFromPropertyImageUrl(url, bucket)
    if (path?.startsWith(prefix)) paths.push(path)
  }
  return paths
}

/** URLs dropped on save: removed from a loaded listing and/or uploaded then discarded this session. */
export function urlsToRemoveFromPropertyImageSave(
  imagesAtLoad: readonly PropertyImage[],
  imagesAfterSave: readonly PropertyImage[],
  uploadedThisSession: ReadonlySet<string>,
): string[] {
  const finalUrls = new Set(propertyImageUrls(imagesAfterSave))
  const toRemove = new Set<string>()
  for (const url of propertyImageUrls(imagesAtLoad)) {
    if (!finalUrls.has(url)) toRemove.add(url)
  }
  for (const url of uploadedThisSession) {
    if (!finalUrls.has(url)) toRemove.add(url)
  }
  return [...toRemove]
}

export function filterPropertyImagesExcludingUrls(
  images: readonly PropertyImage[],
  excludedUrls: ReadonlySet<string>,
): PropertyImage[] {
  if (excludedUrls.size === 0) return [...images]
  return images.filter((img) => !excludedUrls.has(img.url))
}
