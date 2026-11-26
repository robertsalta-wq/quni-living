import { supabase } from './supabase'
import {
  firstAgreedGoogleAddress,
  parseGoogleAddressResult,
  type ParsedAustralianAddress,
} from './googlePlaceAddress'

export type PlaceSuggestion = { placeId: string; label: string }

type PlacesFailure = 'not_configured' | 'mismatch' | 'not_found' | 'unavailable' | 'unauthorized' | 'forbidden' | 'rate_limited'

async function readPlacesJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    const body = (await res.json()) as unknown
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function failureFrom(body: Record<string, unknown> | null, status: number): PlacesFailure {
  if (body?.error === 'not_configured') return 'not_configured'
  if (body?.error === 'unauthorized' || status === 401) return 'unauthorized'
  if (body?.error === 'forbidden' || status === 403) return 'forbidden'
  if (body?.error === 'rate_limited' || status === 429) return 'rate_limited'
  if (status === 503 && body?.error !== 'unavailable') return 'not_configured'
  return 'unavailable'
}

async function fetchPlaces(params: URLSearchParams, signal?: AbortSignal): Promise<Response | 'signed_out'> {
  const { data, error } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (error || !token || signal?.aborted) return 'signed_out'
  return fetch(`/api/places?${params.toString()}`, {
    signal,
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function fetchPlaceSuggestions(
  input: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<{ ok: true; suggestions: PlaceSuggestion[] } | { ok: false; reason: PlacesFailure }> {
  const params = new URLSearchParams({ input, session: sessionToken })
  let res: Response
  try {
    const fetched = await fetchPlaces(params, signal)
    if (fetched === 'signed_out') return { ok: false, reason: 'unauthorized' }
    res = fetched
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
  const body = await readPlacesJson(res)
  if (!res.ok || !body || body.ok !== true) return { ok: false, reason: failureFrom(body, res.status) }
  const suggestions = Array.isArray(body.suggestions) ? body.suggestions : []
  return {
    ok: true,
    suggestions: suggestions
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const row = item as { placeId?: unknown; label?: unknown }
        if (typeof row.placeId !== 'string' || typeof row.label !== 'string') return null
        return { placeId: row.placeId, label: row.label }
      })
      .filter((item): item is PlaceSuggestion => item != null),
  }
}

export async function fetchPlaceDetails(
  placeId: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<{ ok: true; address: ParsedAustralianAddress } | { ok: false; reason: PlacesFailure }> {
  const params = new URLSearchParams({ placeId, session: sessionToken })
  let res: Response
  try {
    const fetched = await fetchPlaces(params, signal)
    if (fetched === 'signed_out') return { ok: false, reason: 'unauthorized' }
    res = fetched
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
  const body = await readPlacesJson(res)
  if (!res.ok || !body || body.ok !== true) return { ok: false, reason: failureFrom(body, res.status) }
  const address = parseGoogleAddressResult(body.place)
  if (!address) return { ok: false, reason: 'not_found' }
  return { ok: true, address }
}

export async function geocodeAddressWithGoogle(
  fields: { address: string; suburb: string; state: string; postcode: string },
  signal?: AbortSignal,
): Promise<{ ok: true; address: ParsedAustralianAddress } | { ok: false; reason: PlacesFailure }> {
  const params = new URLSearchParams({
    confirm: '1',
    address: fields.address,
    suburb: fields.suburb,
    state: fields.state,
    postcode: fields.postcode,
  })
  let res: Response
  try {
    const fetched = await fetchPlaces(params, signal)
    if (fetched === 'signed_out') return { ok: false, reason: 'unauthorized' }
    res = fetched
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
  const body = await readPlacesJson(res)
  if (!res.ok || !body || body.ok !== true) return { ok: false, reason: failureFrom(body, res.status) }
  const results = Array.isArray(body.results) ? body.results : []
  const address = firstAgreedGoogleAddress(results, fields)
  if (!address) return { ok: false, reason: results.length === 0 ? 'not_found' : 'mismatch' }
  return { ok: true, address }
}
