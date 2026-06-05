/** One listing photo with optional short caption (stored in `properties.images` text[]). */
export type PropertyImage = {
  url: string
  description?: string
}

export const MAX_PROPERTY_IMAGE_DESCRIPTION_LENGTH = 200

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
