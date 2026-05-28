import type { Property } from './listings'
import type { ListingsBrowseResult } from './fetchListingsBrowse'
import type { ListingsQueryFilters } from './listingsBrowseTypes'
import { listingIsoDateUtc } from './propertyListingDateWindow'

/** Serialize resolved listing filters for GET /api/listings-browse */
export function listingsBrowseApiSearchParams(
  f: ListingsQueryFilters,
  listingDay = listingIsoDateUtc(),
): string {
  const p = new URLSearchParams()
  p.set('listing_day', listingDay)
  const q = f.q.trim()
  if (q) p.set('q', q)
  if (f.university) p.set('university_id', f.university)
  if (f.campus) p.set('campus_id', f.campus)
  const sub = f.suburb.trim()
  if (sub) p.set('suburb', sub)
  if (f.roomType) p.set('type', f.roomType)
  if (f.priceFilter) p.set('price', f.priceFilter)
  if (f.furnished) p.set('furnished', 'true')
  if (f.sort && f.sort !== 'newest') p.set('sort', f.sort)
  return p.toString()
}

export async function fetchListingsBrowseViaEdge(
  f: ListingsQueryFilters,
  listingDay = listingIsoDateUtc(),
): Promise<ListingsBrowseResult> {
  const qs = listingsBrowseApiSearchParams(f, listingDay)
  const res = await fetch(`/api/listings-browse?${qs}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
  const body = (await res.json().catch(() => null)) as {
    properties?: Property[]
    total?: number
    error?: string
    message?: string
  } | null

  if (res.status === 400 && body?.error === 'near_anchor_unsupported') {
    throw new Error('NEAR_ANCHOR_EDGE_UNSUPPORTED')
  }
  if (!res.ok) {
    throw new Error(body?.error || body?.message || `Listings API ${res.status}`)
  }

  const properties = (body?.properties ?? []) as Property[]
  return {
    properties,
    total: body?.total ?? properties.length,
    distanceKmByPropertyId: new Map(),
  }
}
