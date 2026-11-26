import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireLandlordOrAdmin: vi.fn(),
  consumePlacesRateLimit: vi.fn(() => true),
}))

vi.mock('./lib/placesCaller.js', () => ({
  requireLandlordOrAdmin: mocks.requireLandlordOrAdmin,
}))

vi.mock('./lib/placesRateLimit.js', () => ({
  consumePlacesRateLimit: mocks.consumePlacesRateLimit,
}))

import handler, { PLACE_DETAILS_FIELD_MASK } from './places.js'

const SESSION = '11111111-1111-4111-8111-111111111111'
const fetchMock = vi.fn()

beforeEach(() => {
  process.env.GOOGLE_PLACES_API_KEY = 'test-places-key'
  mocks.requireLandlordOrAdmin.mockReset()
  mocks.consumePlacesRateLimit.mockReset()
  mocks.consumePlacesRateLimit.mockReturnValue(true)
  mocks.requireLandlordOrAdmin.mockResolvedValue({ user: { id: 'landlord-1' } })
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  delete process.env.GOOGLE_PLACES_API_KEY
  vi.unstubAllGlobals()
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('/api/places', () => {
  it('returns 401 for a signed-out caller and does not call Google', async () => {
    mocks.requireLandlordOrAdmin.mockResolvedValue({ error: 'unauthorized', status: 401 })
    const res = await handler(new Request(`https://quni.test/api/places?input=liverpool&session=${SESSION}`))
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'unauthorized' })
    expect(mocks.consumePlacesRateLimit).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 429 before calling Google when the user is over the limit', async () => {
    mocks.consumePlacesRateLimit.mockReturnValue(false)
    const res = await handler(
      new Request(`https://quni.test/api/places?confirm=1&address=1%20King&suburb=Sydney&state=NSW&postcode=2000`),
    )
    expect(res.status).toBe(429)
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'rate_limited' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends one session token and only Essentials Place Details fields', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ addressComponents: [], location: { latitude: -33.9, longitude: 151.2 } }))
    const res = await handler(new Request(`https://quni.test/api/places?placeId=ChIJtest&session=${SESSION}`))
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [called, init] = fetchMock.mock.calls[0] as [URL, { headers: Record<string, string> }]
    const url = new URL(called)
    expect(url.origin + url.pathname).toBe('https://places.googleapis.com/v1/places/ChIJtest')
    expect(url.searchParams.get('sessionToken')).toBe(SESSION)
    expect(init.headers['X-Goog-FieldMask']).toBe(PLACE_DETAILS_FIELD_MASK)
    expect(PLACE_DETAILS_FIELD_MASK).toBe('addressComponents,location')
    expect(init.headers['X-Goog-Api-Key']).toBe('test-places-key')
  })

  it('reuses the session token on autocomplete', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ suggestions: [] }))
    const res = await handler(new Request(`https://quni.test/api/places?input=liverpool&session=${SESSION}`))
    expect(res.status).toBe(200)
    const [called, init] = fetchMock.mock.calls[0] as [string, { body: string }]
    expect(called).toBe('https://places.googleapis.com/v1/places:autocomplete')
    expect(JSON.parse(init.body)).toMatchObject({
      input: 'liverpool',
      includedRegionCodes: ['au'],
      sessionToken: SESSION,
    })
  })

  it('does not call Place Details or Autocomplete without a session token', async () => {
    const res = await handler(new Request('https://quni.test/api/places?placeId=ChIJtest'))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'session_required' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('calls the Geocoding API with the Google key only after the session check', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: 'OK', results: [] }))
    const res = await handler(
      new Request('https://quni.test/api/places?confirm=1&address=1%20King%20St&suburb=Sydney&state=NSW&postcode=2000'),
    )
    expect(res.status).toBe(200)
    const called = new URL(String(fetchMock.mock.calls[0][0]))
    expect(called.origin + called.pathname).toBe('https://maps.googleapis.com/maps/api/geocode/json')
    expect(called.searchParams.get('key')).toBe('test-places-key')
    expect(called.searchParams.get('components')).toBe('country:AU')
  })
})
