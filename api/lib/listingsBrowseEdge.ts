/**
 * PostgREST URL builder for public listings browse (Edge / no Supabase JS client).
 */

const PROPERTY_CARD_LIST_SELECT = [
  'id',
  'title',
  'slug',
  'rent_per_week',
  'room_type',
  'images',
  'bedrooms',
  'bathrooms',
  'furnished',
  'bond',
  'lease_length',
  'listing_type',
  'featured',
  'address',
  'suburb',
  'state',
  'postcode',
  'latitude',
  'longitude',
  'landlord_id',
  'university_id',
  'campus_id',
  'available_from',
  'available_to',
  'status',
  'max_occupants',
  'couple_surcharge_per_week',
  'parking_surcharge_per_week',
  'parking_available',
  'created_at',
  'landlord_profiles(id,full_name,avatar_url,verified)',
  'universities(id,name,slug)',
  'campuses(id,name,slug)',
].join(',')

export type ListingsBrowseEdgeFilters = {
  q: string
  universityId: string
  campusId: string
  suburb: string
  roomType: string
  priceFilter: string
  furnished: boolean
  sort: string
}

function escapeIlikePattern(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/,/g, '')
}

function priceRangeFromBucket(value: string): [number, number] {
  switch (value) {
    case '0-200':
      return [0, 200]
    case '200-300':
      return [200, 300]
    case '300-400':
      return [300, 400]
    case '400+':
      return [400, 99_999]
    default:
      return [0, 99_999]
  }
}

const ROOM_TYPES = new Set(['single', 'shared', 'studio', 'apartment', 'house'])

export function listingIsoDateUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

export function parseListingsBrowseEdgeFilters(searchParams: URLSearchParams): ListingsBrowseEdgeFilters {
  return {
    q: (searchParams.get('q') ?? '').trim(),
    universityId: (searchParams.get('university_id') ?? '').trim(),
    campusId: (searchParams.get('campus_id') ?? '').trim(),
    suburb: (searchParams.get('suburb') ?? '').trim(),
    roomType: (searchParams.get('type') ?? '').trim(),
    priceFilter: (searchParams.get('price') ?? '').trim(),
    furnished: searchParams.get('furnished') === 'true',
    sort: (searchParams.get('sort') ?? 'newest').trim() || 'newest',
  }
}

/** True when this search must use client-side Supabase (geo RPC). */
export function edgeBrowseUnsupported(searchParams: URLSearchParams): boolean {
  return Boolean(
    searchParams.get('near_lat')?.trim() &&
      searchParams.get('near_lon')?.trim(),
  )
}

export function buildListingsBrowsePostgrestUrl(
  supabaseUrl: string,
  f: ListingsBrowseEdgeFilters,
  listingDay: string,
): string {
  const base = supabaseUrl.replace(/\/$/, '')
  const params = new URLSearchParams()
  params.set('select', PROPERTY_CARD_LIST_SELECT)
  params.set('status', 'eq.active')

  const dateOr = `or(available_to.is.null,available_to.gte.${listingDay})`
  const text = f.q
  if (text.length > 0) {
    const safe = escapeIlikePattern(text)
    const textOr = `or(title.ilike.%${safe}%,suburb.ilike.%${safe}%,address.ilike.%${safe}%)`
    params.set('and', `(${dateOr},${textOr})`)
  } else {
    params.set('or', `(available_to.is.null,available_to.gte.${listingDay})`)
  }

  if (f.campusId) {
    params.set('campus_id', `eq.${f.campusId}`)
  } else if (f.universityId) {
    params.set('university_id', `eq.${f.universityId}`)
  }

  const sub = f.suburb
  if (sub.length > 0) {
    params.set('suburb', `ilike.${escapeIlikePattern(sub)}`)
  }

  if (f.roomType && ROOM_TYPES.has(f.roomType)) {
    params.set('room_type', `eq.${f.roomType}`)
  }

  if (f.priceFilter) {
    const [min, max] = priceRangeFromBucket(f.priceFilter)
    params.set('rent_per_week', `gte.${min}`)
    params.append('rent_per_week', `lte.${max}`)
  }

  if (f.furnished) {
    params.set('furnished', 'eq.true')
  }

  if (f.sort === 'rent_asc') {
    params.append('order', 'rent_per_week.asc')
  } else if (f.sort === 'rent_desc') {
    params.append('order', 'rent_per_week.desc')
  } else {
    params.append('order', 'featured.desc')
    params.append('order', 'created_at.desc')
  }

  return `${base}/rest/v1/properties?${params.toString()}`
}

export async function fetchListingsFromPostgrest(
  supabaseUrl: string,
  anonKey: string,
  f: ListingsBrowseEdgeFilters,
  listingDay: string,
): Promise<{ properties: unknown[]; total: number }> {
  const url = buildListingsBrowsePostgrestUrl(supabaseUrl, f, listingDay)
  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`PostgREST ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = (await res.json()) as unknown[]
  return { properties: data, total: data.length }
}
