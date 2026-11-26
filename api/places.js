/**
 * Google Places proxy for listing addresses.
 *
 * The key stays on the server (GOOGLE_PLACES_API_KEY). Do not send it to the browser.
 * Only a signed-in landlord or platform admin can call this. Each user is limited to
 * 60 requests a minute on this instance. Place Details asks only for Essentials fields.
 *
 * GET /api/places?probe=1
 * GET /api/places?input=&session=
 * GET /api/places?placeId=&session=
 * GET /api/places?confirm=1&address=&suburb=&state=&postcode=
 */
import { requireLandlordOrAdmin } from './lib/placesCaller.js'
import { consumePlacesRateLimit } from './lib/placesRateLimit.js'

export const config = {
  runtime: 'edge',
}

/** Place Details Essentials only. A Pro or Enterprise field would bill the whole call at that SKU. */
export const PLACE_DETAILS_FIELD_MASK = 'addressComponents,location'

const SESSION_TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function placesKey() {
  return (process.env.GOOGLE_PLACES_API_KEY || '').trim()
}

function placeResource(placeId) {
  return String(placeId || '').trim().replace(/^places\//, '')
}

function sessionToken(raw) {
  const value = String(raw || '').trim()
  return SESSION_TOKEN.test(value) ? value : ''
}

export default async function handler(req) {
  if (req.method !== 'GET') return json({ ok: false, error: 'method' }, 405)

  const access = await requireLandlordOrAdmin(req)
  if (!access.user) return json({ ok: false, error: access.error }, access.status)

  const url = new URL(req.url)
  if (url.searchParams.get('probe') === '1') {
    return json({ ok: true, configured: Boolean(placesKey()) })
  }

  if (!consumePlacesRateLimit(access.user.id)) return json({ ok: false, error: 'rate_limited' }, 429)

  const key = placesKey()
  if (!key) return json({ ok: false, error: 'not_configured' }, 503)

  const session = sessionToken(url.searchParams.get('session'))

  try {
    if (url.searchParams.get('confirm') === '1') {
      const parts = ['address', 'suburb', 'state', 'postcode'].map((name) =>
        (url.searchParams.get(name) || '').trim(),
      )
      const query = `${parts.filter(Boolean).join(', ')}, Australia`
      const geocodeUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json')
      geocodeUrl.searchParams.set('address', query)
      geocodeUrl.searchParams.set('components', 'country:AU')
      geocodeUrl.searchParams.set('region', 'au')
      geocodeUrl.searchParams.set('key', key)
      const res = await fetch(geocodeUrl)
      const body = await res.json()
      if (!res.ok || body.status === 'REQUEST_DENIED') return json({ ok: false, error: 'unavailable' }, 502)
      const results = Array.isArray(body.results) ? body.results.slice(0, 5) : []
      return json({ ok: true, results })
    }

    const placeId = placeResource(url.searchParams.get('placeId'))
    if (placeId) {
      if (!session) return json({ ok: false, error: 'session_required' }, 400)
      const detailsUrl = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`)
      detailsUrl.searchParams.set('sessionToken', session)
      const res = await fetch(detailsUrl, {
        headers: {
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK,
        },
      })
      const body = await res.json()
      if (!res.ok) return json({ ok: false, error: 'unavailable' }, 502)
      return json({ ok: true, place: body })
    }

    const input = (url.searchParams.get('input') || '').trim()
    if (input.length < 3) return json({ ok: true, suggestions: [] })
    if (!session) return json({ ok: false, error: 'session_required' }, 400)
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Goog-Api-Key': key,
      },
      body: JSON.stringify({
        input,
        includedRegionCodes: ['au'],
        languageCode: 'en',
        sessionToken: session,
      }),
    })
    const body = await res.json()
    if (!res.ok) return json({ ok: false, error: 'unavailable' }, 502)
    const suggestions = (Array.isArray(body.suggestions) ? body.suggestions : [])
      .map((item) => item?.placePrediction)
      .filter(Boolean)
      .slice(0, 5)
      .map((prediction) => ({
        placeId: placeResource(prediction.placeId || prediction.place),
        label: prediction.text?.text || '',
      }))
      .filter((item) => item.placeId && item.label)
    return json({ ok: true, suggestions })
  } catch {
    return json({ ok: false, error: 'unavailable' }, 502)
  }
}
