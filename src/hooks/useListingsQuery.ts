import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Property } from '../lib/listings'
import { fetchListingsBrowse } from '../lib/fetchListingsBrowse'
import {
  peekListingsBrowseCache,
  rememberListingsPrefetch,
  writeListingsBrowseCache,
} from '../lib/listingsBrowseCache'
import type { ListingsQueryFilters } from '../lib/listingsBrowseTypes'
import { fetchUnavailablePropertyIdsForDateRange } from '../lib/propertyLeaseAvailability'

export type { ListingsQueryFilters } from '../lib/listingsBrowseTypes'

type Result = {
  properties: Property[]
  total: number
  loading: boolean
  refreshing: boolean
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

export function useListingsQuery(
  filters: ListingsQueryFilters,
  enabled: boolean,
  queryKey: string,
  viewerStudentProfileId?: string | null,
): Result {
  const initialCache = enabled ? peekListingsBrowseCache(queryKey) : null
  const [properties, setProperties] = useState<Property[]>(initialCache?.properties ?? [])
  const [total, setTotal] = useState(initialCache?.total ?? 0)
  const [loading, setLoading] = useState(enabled && initialCache == null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unavailableForSelectedDatesIds, setUnavailableForSelectedDatesIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [distanceKmByPropertyId, setDistanceKmByPropertyId] = useState<Map<string, number>>(
    () => initialCache?.distanceKmByPropertyId ?? new Map(),
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
      setRefreshing(false)
      setProperties([])
      setTotal(0)
      setUnavailableForSelectedDatesIds(new Set())
      setDistanceKmByPropertyId(new Map())
      return
    }

    const f = filtersRef.current
    let cancelled = false
    const cached = peekListingsBrowseCache(queryKey)
    const showFullSkeleton = !cached?.properties.length

    if (showFullSkeleton) {
      setLoading(true)
    } else {
      setRefreshing(true)
      setProperties(cached.properties)
      setTotal(cached.total)
      setDistanceKmByPropertyId(cached.distanceKmByPropertyId)
    }
    setError(null)

    ;(async () => {
      try {
        const result = await withListingsFetchTimeout(fetchListingsBrowse(f), 'Listings search')
        if (cancelled) return

        setProperties(result.properties)
        setTotal(result.total)
        setDistanceKmByPropertyId(result.distanceKmByPropertyId)
        writeListingsBrowseCache(queryKey, result)
        rememberListingsPrefetch(queryKey, f)
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
          if (showFullSkeleton) {
            setProperties([])
            setTotal(0)
            setUnavailableForSelectedDatesIds(new Set())
            setDistanceKmByPropertyId(new Map())
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
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

    const run = () => {
      void (async () => {
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
    }

    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(run, { timeout: 800 })
      return () => {
        cancelled = true
        cancelIdleCallback(id)
      }
    }

    const t = window.setTimeout(run, 0)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [enabled, propertyIdsKey, queryKey, tick])

  return {
    properties,
    total,
    loading,
    refreshing,
    error,
    refetch,
    unavailableForSelectedDatesIds,
    distanceKmByPropertyId,
  }
}
