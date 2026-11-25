/**
 * Google Places proxy for listing addresses.
 *
 * The key stays on the server (GOOGLE_PLACES_API_KEY). Do not send it to the browser.
 * Autocomplete is limited to Australia. Place Details asks only for Essentials fields.
 *
 * GET /api/places?input=&session=
 * GET /api/places?placeId=&session=
 * GET /api/places?confirm=1&address=&suburb=&state=&postcode=
 */
export const config = {
  runtime: 'edge',
}

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
  const id = String(placeId || '').trim().replace(/^places\//, '')
  return id
}

export default async function handler(req) {
  if (req.method !== 'GET') return json({ ok: false, error: 'method' }, 405)
  const key = placesKey()
  if (!key) return json({ ok: false, error: 'not_configured' }, 503)

  const url = new URL(req.url)
  const session = (url.searchParams.get('session') || '').trim()

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
      const detailsUrl = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`)
      if (session) detailsUrl.searchParams.set('sessionToken', session)
      const res = await fetch(detailsUrl, {
        headers: {
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'id,formattedAddress,addressComponents,location,types',
        },
      })
      const body = await res.json()
      if (!res.ok) return json({ ok: false, error: 'unavailable' }, 502)
      return json({ ok: true, place: body })
    }

    const input = (url.searchParams.get('input') || '').trim()
    if (input.length < 3) return json({ ok: true, suggestions: [] })
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
        sessionToken: session || undefined,
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
