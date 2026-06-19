import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { supabase } from './supabase'
import {
  escapeIlikePattern,
  isRoomType,
  priceRangeFromBucket,
  type ListingsSort,
  type Property,
} from './listings'
import { PROPERTY_CARD_LIST_SELECT } from './propertyCardSelect'
import { applyPropertyListingDateWindow, listingIsoDateUtc } from './propertyListingDateWindow'
import { rpcPropertiesNearPoint } from './propertiesNearCampusRpc'
import { fetchListingsBrowseViaEdge } from './listingsBrowseApi'
import type { ListingsQueryFilters } from './listingsBrowseTypes'
import type { NearSearchAnchor } from './workplaceLocation'

export type ListingsBrowseResult = {
  properties: Property[]
  total: number
  distanceKmByPropertyId: Map<string, number>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PropsQuery = PostgrestFilterBuilder<any, any, any, any, any>

function applyListingsFiltersToQuery(query: PropsQuery, f: ListingsQueryFilters): PropsQuery {
  let q = query

  const text = f.q.trim()
  if (text.length > 0) {
    const safe = escapeIlikePattern(text)
    q = q.or(`title.ilike.%${safe}%,suburb.ilike.%${safe}%,address.ilike.%${safe}%`)
  }

  if (f.campus) {
    q = q.eq('campus_id', f.campus)
  } else if (f.university) {
    q = q.eq('university_id', f.university)
  }

  const sub = f.suburb.trim()
  if (sub.length > 0) {
    const safe = escapeIlikePattern(sub)
    q = q.ilike('suburb', safe)
  }

  if (f.roomType && isRoomType(f.roomType)) {
    q = q.eq('room_type', f.roomType)
  }

  if (f.priceFilter) {
    const [min, max] = priceRangeFromBucket(f.priceFilter)
    q = q.gte('rent_per_week', min).lte('rent_per_week', max)
  }

  if (f.furnished) {
    q = q.eq('furnished', true)
  }

  return q
}

function orderListingsQuery(query: PropsQuery, sort: ListingsSort): PropsQuery {
  if (sort === 'rent_asc') {
    return query.order('rent_per_week', { ascending: true })
  }
  if (sort === 'rent_desc') {
    return query.order('rent_per_week', { ascending: false })
  }
  return query.order('featured', { ascending: false }).order('created_at', { ascending: false })
}

async function fetchNearAnchorListings(
  f: ListingsQueryFilters,
  listingDay: string,
): Promise<ListingsBrowseResult> {
  const anchor = f.nearAnchor as NearSearchAnchor
  const { data: nearRows, error: nearErr } = await rpcPropertiesNearPoint(
    supabase,
    anchor.lat,
    anchor.lon,
    anchor.radiusKm,
  )
  if (nearErr) {
    if (/properties_near_point|schema cache|42883/i.test(nearErr.message)) {
      throw new Error(
        'Distance search needs the latest database migration (properties_near_point). Run supabase migrations, wait ~30s, then retry.',
      )
    }
    throw nearErr
  }

  const distanceKmByPropertyId = new Map<string, number>()
  for (const row of nearRows ?? []) {
    distanceKmByPropertyId.set(row.id, row.distance_km)
  }

  const ids = [...distanceKmByPropertyId.keys()]
  if (ids.length === 0) {
    return { properties: [], total: 0, distanceKmByPropertyId }
  }

  const chunkSize = 120
  const rows: Property[] = []
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    let query = applyPropertyListingDateWindow(
      supabase.from('properties').select(PROPERTY_CARD_LIST_SELECT),
      listingDay,
    )
      .eq('status', 'active')
      .in('id', chunk)
    query = applyListingsFiltersToQuery(query, f)
    const { data, error: chunkErr } = await query
    if (chunkErr) throw chunkErr
    if (data?.length) rows.push(...(data as Property[]))
  }

  const sort = f.sort as ListingsSort
  const sortByDistance = sort === 'distance'
  rows.sort((a, b) => {
    const da = distanceKmByPropertyId.get(a.id) ?? 9999
    const db = distanceKmByPropertyId.get(b.id) ?? 9999
    if (sortByDistance && da !== db) return da - db
    if (a.featured !== b.featured) return a.featured ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return { properties: rows, total: rows.length, distanceKmByPropertyId }
}

/** Single round-trip for browse (direct PostgREST in browser; Edge API as fallback). */
export async function fetchListingsBrowse(
  f: ListingsQueryFilters,
  listingDay = listingIsoDateUtc(),
): Promise<ListingsBrowseResult> {
  if (f.nearAnchor) {
    return fetchNearAnchorListings(f, listingDay)
  }

  if (typeof window !== 'undefined') {
    const sort = f.sort as ListingsSort
    let query = applyPropertyListingDateWindow(
      supabase.from('properties').select(PROPERTY_CARD_LIST_SELECT),
      listingDay,
    ).eq('status', 'active')

    query = applyListingsFiltersToQuery(query, f)
    query = orderListingsQuery(query, sort)

    const { data, error: fetchError } = await query
    if (!fetchError) {
      const rows = (data ?? []) as Property[]
      return { properties: rows, total: rows.length, distanceKmByPropertyId: new Map() }
    }

    console.warn('[fetchListingsBrowse] direct Supabase failed, trying edge API', fetchError)
    try {
      return await fetchListingsBrowseViaEdge(f, listingDay)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'NEAR_ANCHOR_EDGE_UNSUPPORTED') {
        throw fetchError
      }
      throw fetchError
    }
  }

  const sort = f.sort as ListingsSort
  let query = applyPropertyListingDateWindow(
    supabase.from('properties').select(PROPERTY_CARD_LIST_SELECT),
    listingDay,
  ).eq('status', 'active')

  query = applyListingsFiltersToQuery(query, f)
  query = orderListingsQuery(query, sort)

  const { data, error: fetchError } = await query
  if (fetchError) throw fetchError
  const rows = (data ?? []) as Property[]
  return { properties: rows, total: rows.length, distanceKmByPropertyId: new Map() }
}

export const DEFAULT_LISTINGS_BROWSE_FILTERS: ListingsQueryFilters = {
  q: '',
  university: '',
  campus: '',
  suburb: '',
  roomType: '',
  priceFilter: '',
  furnished: false,
  sort: 'newest',
  nearAnchor: null,
  availabilityMoveIn: null,
  availabilityMoveOut: null,
}
