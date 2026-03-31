/**
 * Geocode helper (Vercel / Next-style serverless function).
 *
 * Client calls: GET /api/geocode?q=<address>
 * Returns: { ok: true, lat: number, lon: number } or { ok:false, error: string }
 *
 * Uses OpenStreetMap Nominatim (no API key).
 * NOTE: Respect Nominatim's usage policy and rate-limit at the caller level.
 */
export const config = {
  runtime: 'edge',
}

const CACHE_KEY = '__quni_geocode_cache_v1'
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

function json(body, status = 200, origin) {
  const allowOrigin = origin || '*'
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=0, s-maxage=0',
    },
  })
}

function getCache() {
  if (!globalThis[CACHE_KEY]) globalThis[CACHE_KEY] = new Map()
  return globalThis[CACHE_KEY]
}

export default async function handler(request) {
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  if (request.method !== 'GET') {
    return json({ ok: false, error: 'Method not allowed' }, 405, origin)
  }

  const url = new URL(request.url)
  const q = (url.searchParams.get('q') || url.searchParams.get('address') || '').trim()
  if (!q) return json({ ok: false, error: 'Missing query parameter q' }, 400, origin)

  const cache = getCache()
  const cacheTtlMs = Number(process.env.GEOCODE_CACHE_TTL_MS || DEFAULT_TTL_MS)
  const cacheKey = q.toLowerCase()
  const cached = cache.get(cacheKey)
  if (cached && cached.ts && Date.now() - cached.ts < cacheTtlMs) {
    return json({ ok: true, lat: cached.lat, lon: cached.lon, cached: true }, 200, origin)
  }

  // Nominatim usage policy: keep requests reasonable; include User-Agent; optionally email.
  const userAgent =
    process.env.NOMINATIM_USER_AGENT?.trim() || 'quni-living/1.0 (contact: hello@quni.com.au)'
  const nominatimEmail = process.env.NOMINATIM_EMAIL?.trim() || ''

  const searchUrl = new URL('https://nominatim.openstreetmap.org/search')
  searchUrl.searchParams.set('format', 'json')
  searchUrl.searchParams.set('limit', '1')
  searchUrl.searchParams.set('addressdetails', '0')
  searchUrl.searchParams.set('countrycodes', 'AU')
  searchUrl.searchParams.set('q', q)
  if (nominatimEmail) searchUrl.searchParams.set('email', nominatimEmail)

  let resp
  try {
    resp = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: { 'User-Agent': userAgent },
    })
  } catch {
    return json({ ok: false, error: 'Geocoding request failed.' }, 502, origin)
  }

  if (!resp.ok) {
    const status = resp.status
    if (status === 429) {
      return json({ ok: false, error: 'Geocoding rate-limited. Try again in a moment.' }, 429, origin)
    }
    return json({ ok: false, error: `Geocoding failed (${status}).` }, 502, origin)
  }

  const data = await resp.json().catch(() => null)
  const item = Array.isArray(data) ? data[0] : null
  const lat = item?.lat != null ? Number(item.lat) : NaN
  const lon = item?.lon != null ? Number(item.lon) : NaN
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json({ ok: false, error: 'Could not find coordinates for that address.' }, 404, origin)
  }

  cache.set(cacheKey, { lat, lon, ts: Date.now() })
  return json({ ok: true, lat, lon }, 200, origin)
}

