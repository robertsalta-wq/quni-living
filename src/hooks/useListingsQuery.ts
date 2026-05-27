import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { supabase } from '../lib/supabase'
import {
  escapeIlikePattern,
  isRoomType,
  priceRangeFromBucket,
  type ListingsSort,
  type Property,
} from '../lib/listings'
import { PROPERTY_CARD_LIST_SELECT } from '../lib/propertyCardSelect'
import { applyPropertyListingDateWindow, listingIsoDateUtc } from '../lib/propertyListingDateWindow'
import { fetchUnavailablePropertyIdsForDateRange } from '../lib/propertyLeaseAvailability'
import { rpcPropertiesNearPoint } from '../lib/propertiesNearCampusRpc'
import type { NearSearchAnchor } from '../lib/workplaceLocation'

export type ListingsQueryFilters = {
  q: string
  university: string
  campus: string
  suburb: string
  roomType: string
  priceFilter: string
  furnished: boolean
  sort: string
  nearAnchor: NearSearchAnchor | null
  availabilityMoveIn: string | null
  availabilityMoveOut: string | null
}

type Result = {
  properties: Property[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => void
  unavailableForSelectedDatesIds: Set<string>
  distanceKmByPropertyId: Map<string, number>
}

/** Fail fast enough to retry; prod listings fetch is typically ~2s. */
const LISTINGS_FETCH_TIMEOUT_MS = 10_000
const AVAILABILITY_RPC_CHUNK_SIZE = 80

function withListingsFetchTimeout<T>(promise: PromiseLike<T>, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(`${label} timed out. Check your connection and tap Retry.`),
          ),
        LISTINGS_FETCH_TIMEOUT_MS,
      )
    }),
  ])
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
): Promise<{ rows: Property[]; distanceById: Map<string, number> }> {
  const anchor = f.nearAnchor!
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

  const distanceById = new Map<string, number>()
  for (const row of nearRows ?? []) {
    distanceById.set(row.id, row.distance_km)
  }

  const ids = [...distanceById.keys()]
  if (ids.length === 0) {
    return { rows: [], distanceById }
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
    const da = distanceById.get(a.id) ?? 9999
    const db = distanceById.get(b.id) ?? 9999
    if (sortByDistance && da !== db) return da - db
    if (a.featured !== b.featured) return a.featured ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return { rows, distanceById }
}

export function useListingsQuery(
  filters: ListingsQueryFilters,
  enabled: boolean,
  queryKey: string,
  viewerStudentProfileId?: string | null,
): Result {
  const [properties, setProperties] = useState<Property[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [unavailableForSelectedDatesIds, setUnavailableForSelectedDatesIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [distanceKmByPropertyId, setDistanceKmByPropertyId] = useState<Map<string, number>>(
    () => new Map(),
  )
  const [tick, setTick] = useState(0)

  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const viewerStudentProfileIdRef = useRef(viewerStudentProfileId)
  viewerStudentProfileIdRef.current = viewerStudentProfileId

  const propertyIdsKey = useMemo(
    () => properties.map((p) => p.id).join(','),
    [properties],
  )

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setProperties([])
      setTotal(0)
      setUnavailableForSelectedDatesIds(new Set())
      setDistanceKmByPropertyId(new Map())
      return
    }

    const f = filtersRef.current
    let cancelled = false
    setLoading(true)
    setError(null)
    setUnavailableForSelectedDatesIds(new Set())
    setDistanceKmByPropertyId(new Map())

    ;(async () => {
      try {
        const listingDay = listingIsoDateUtc()
        const sort = f.sort as ListingsSort
        let rows: Property[] = []
        let distanceById = new Map<string, number>()
        let totalCount = 0

        if (f.nearAnchor) {
          const near = await withListingsFetchTimeout(
            fetchNearAnchorListings(f, listingDay),
            'Listings search',
          )
          rows = near.rows
          distanceById = near.distanceById
          totalCount = rows.length
        } else {
          let query = applyPropertyListingDateWindow(
            supabase.from('properties').select(PROPERTY_CARD_LIST_SELECT, { count: 'exact' }),
            listingDay,
          ).eq('status', 'active')

          query = applyListingsFiltersToQuery(query, f)
          query = orderListingsQuery(query, sort)

          const { data, error: fetchError, count } = await withListingsFetchTimeout(
            query,
            'Listings search',
          )
          if (fetchError) throw fetchError
          rows = (data ?? []) as Property[]
          totalCount = count ?? 0
        }

        if (cancelled) return

        setProperties(rows)
        setTotal(totalCount)
        setDistanceKmByPropertyId(distanceById)
      } catch (e) {
        if (!cancelled) {
          console.error(e)
          const raw =
            e && typeof e === 'object' && 'message' in e
              ? String((e as { message: unknown }).message)
              : ''
          const missingSchema =
            /could not find the table|schema cache|PGRST205|relation .* does not exist|properties_near_point/i.test(
              raw,
            )
          setError(
            missingSchema
              ? 'Listings need the full database schema. In Supabase → SQL Editor, run supabase/quni_supabase_schema.sql (see supabase/README.md). Wait ~30s, then Retry.'
              : raw || 'Failed to load listings. Please try again.',
          )
          setProperties([])
          setTotal(0)
          setUnavailableForSelectedDatesIds(new Set())
          setDistanceKmByPropertyId(new Map())
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, queryKey, tick])

  // Date badges load after cards render — do not block the listings grid on this RPC.
  useEffect(() => {
    if (!enabled) return

    const f = filtersRef.current
    const moveIn = f.availabilityMoveIn?.trim() ?? ''
    if (!moveIn || !propertyIdsKey) {
      setUnavailableForSelectedDatesIds(new Set())
      return
    }

    const ids = propertyIdsKey.split(',').filter(Boolean)
    let cancelled = false

    ;(async () => {
      try {
        const blocked = new Set<string>()
        for (let i = 0; i < ids.length; i += AVAILABILITY_RPC_CHUNK_SIZE) {
          const chunk = ids.slice(i, i + AVAILABILITY_RPC_CHUNK_SIZE)
          const part = await fetchUnavailablePropertyIdsForDateRange(
            supabase,
            chunk,
            moveIn,
            f.availabilityMoveOut,
            viewerStudentProfileIdRef.current ?? null,
          )
          for (const id of part) blocked.add(id)
          if (cancelled) return
        }
        if (!cancelled) setUnavailableForSelectedDatesIds(blocked)
      } catch (e) {
        console.warn('[useListingsQuery] availability check failed', e)
        if (!cancelled) setUnavailableForSelectedDatesIds(new Set())
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, propertyIdsKey, queryKey, tick])

  return { properties, total, loading, error, refetch, unavailableForSelectedDatesIds, distanceKmByPropertyId }
}
