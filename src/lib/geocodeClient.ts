export type GeoPoint = { lat: number; lon: number }

const geocodeCache = new Map<string, GeoPoint | null>()

type GeocodeResponse = { ok?: boolean; lat?: number; lon?: number; error?: string }

/** Client geocode via Vercel `/api/geocode` (Nominatim, AU). */
export async function geocodeQuery(
  query: string,
  signal?: AbortSignal,
): Promise<GeoPoint | null> {
  const q = query.trim()
  if (q.length < 4) return null

  const key = q.toLowerCase()
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null

  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal })
    const body = (await res.json()) as GeocodeResponse
    if (!body.ok || body.lat == null || body.lon == null) {
      geocodeCache.set(key, null)
      return null
    }
    const pt = { lat: body.lat, lon: body.lon }
    geocodeCache.set(key, pt)
    return pt
  } catch {
    if (signal?.aborted) return null
    geocodeCache.set(key, null)
    return null
  }
}

export async function geocodeFirstMatch(
  queries: string[],
  signal?: AbortSignal,
): Promise<GeoPoint | null> {
  for (const q of queries) {
    const pt = await geocodeQuery(q, signal)
    if (pt) return pt
  }
  return null
}
