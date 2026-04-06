import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  escapeIlikePattern,
  isRoomType,
  priceRangeFromBucket,
  type ListingsSort,
  type Property,
} from '../lib/listings'
import { PROPERTY_CARD_LIST_SELECT } from '../lib/propertyCardSelect'
import { fetchPropertyIdsLeasedToOthers } from '../lib/propertyLeaseAvailability'

export type ListingsQueryFilters = {
  q: string
  university: string
  campus: string
  suburb: string
  roomType: string
  priceFilter: string
  furnished: boolean
  sort: string
}

type Result = {
  properties: Property[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => void
  /** Properties with a confirmed/active booking held by someone other than the viewer (when viewer student id passed). */
  leasedPropertyIds: Set<string>
}

export function useListingsQuery(
  filters: ListingsQueryFilters,
  enabled: boolean,
  /** Serialized URL (or any string that changes when filters change) */
  queryKey: string,
  /** When set (student profile id), that student's own lease is excluded from the set. */
  viewerStudentProfileId?: string | null,
): Result {
  const [properties, setProperties] = useState<Property[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [leasedPropertyIds, setLeasedPropertyIds] = useState<Set<string>>(() => new Set())
  const [tick, setTick] = useState(0)

  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      setProperties([])
      setTotal(0)
      setLeasedPropertyIds(new Set())
      return
    }

    const f = filtersRef.current
    let cancelled = false
    setLoading(true)
    setError(null)
    setLeasedPropertyIds(new Set())

    ;(async () => {
      try {
        let query = supabase
          .from('properties')
          .select(PROPERTY_CARD_LIST_SELECT, { count: 'exact' })
          .eq('status', 'active')

        const q = f.q.trim()
        if (q.length > 0) {
          const safe = escapeIlikePattern(q)
          query = query.or(
            `title.ilike.%${safe}%,suburb.ilike.%${safe}%,address.ilike.%${safe}%`,
          )
        }

        if (f.campus) {
          query = query.eq('campus_id', f.campus)
        } else if (f.university) {
          query = query.eq('university_id', f.university)
        }

        const sub = f.suburb.trim()
        if (sub.length > 0) {
          const safe = escapeIlikePattern(sub)
          query = query.ilike('suburb', safe)
        }

        if (f.roomType && isRoomType(f.roomType)) {
          query = query.eq('room_type', f.roomType)
        }

        if (f.priceFilter) {
          const [min, max] = priceRangeFromBucket(f.priceFilter)
          query = query.gte('rent_per_week', min).lte('rent_per_week', max)
        }

        if (f.furnished) {
          query = query.eq('furnished', true)
        }

        const sort = f.sort as ListingsSort
        if (sort === 'rent_asc') {
          query = query.order('rent_per_week', { ascending: true })
        } else if (sort === 'rent_desc') {
          query = query.order('rent_per_week', { ascending: false })
        } else {
          query = query
            .order('featured', { ascending: false })
            .order('created_at', { ascending: false })
        }

        const { data, error: fetchError, count } = await query

        if (cancelled) return
        if (fetchError) throw fetchError

        const rows = (data ?? []) as Property[]
        setProperties(rows)
        setTotal(count ?? 0)

        const ids = rows.map((p) => p.id).filter(Boolean)
        if (ids.length > 0) {
          const leased = await fetchPropertyIdsLeasedToOthers(
            supabase,
            ids,
            viewerStudentProfileId ?? null,
          )
          if (!cancelled) setLeasedPropertyIds(leased)
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e)
          const raw =
            e && typeof e === 'object' && 'message' in e
              ? String((e as { message: unknown }).message)
              : ''
          const missingSchema =
            /could not find the table|schema cache|PGRST205|relation .* does not exist/i.test(raw)
          setError(
            missingSchema
              ? 'Listings need the full database schema. In Supabase → SQL Editor, run supabase/quni_supabase_schema.sql (see supabase/README.md). Wait ~30s, then Retry.'
              : raw || 'Failed to load listings. Please try again.',
          )
          setProperties([])
          setTotal(0)
          setLeasedPropertyIds(new Set())
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, queryKey, tick, viewerStudentProfileId])

  return { properties, total, loading, error, refetch, leasedPropertyIds }
}
