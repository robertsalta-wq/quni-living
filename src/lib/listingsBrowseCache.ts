import type { Property } from './listings'
import {
  DEFAULT_LISTINGS_BROWSE_FILTERS,
  fetchListingsBrowse,
  type ListingsBrowseResult,
} from './fetchListingsBrowse'
import type { ListingsQueryFilters } from './listingsBrowseTypes'
import { isSupabaseConfigured } from './supabase'

const MEMORY_TTL_MS = 5 * 60 * 1000
const STORAGE_TTL_MS = 30 * 60 * 1000
const STORAGE_PREFIX = 'quni-listings-browse:v1:'
const LAST_PREFETCH_KEY = 'quni-listings-last-prefetch:v1'

type CacheEntry = {
  at: number
  properties: Property[]
  total: number
}

const memory = new Map<string, CacheEntry>()

function cacheKey(queryKey: string): string {
  return queryKey || '__default__'
}

function readStorage(key: string): CacheEntry | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry & { distanceKmByPropertyId?: unknown }
    if (!parsed.at || !Array.isArray(parsed.properties)) return null
    if (Date.now() - parsed.at > STORAGE_TTL_MS) return null
    return { at: parsed.at, properties: parsed.properties, total: parsed.total ?? parsed.properties.length }
  } catch {
    return null
  }
}

function writeStorage(key: string, entry: CacheEntry): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry))
  } catch {
    /* quota */
  }
}

export function peekListingsBrowseCache(queryKey: string): ListingsBrowseResult | null {
  const key = cacheKey(queryKey)
  const mem = memory.get(key)
  if (mem && Date.now() - mem.at < MEMORY_TTL_MS) {
    return { properties: mem.properties, total: mem.total, distanceKmByPropertyId: new Map() }
  }
  const stored = readStorage(key)
  if (!stored) return null
  memory.set(key, stored)
  return { properties: stored.properties, total: stored.total, distanceKmByPropertyId: new Map() }
}

export function writeListingsBrowseCache(
  queryKey: string,
  result: Pick<ListingsBrowseResult, 'properties' | 'total'>,
): void {
  const key = cacheKey(queryKey)
  const entry: CacheEntry = { at: Date.now(), properties: result.properties, total: result.total }
  memory.set(key, entry)
  writeStorage(key, entry)
}

const warmInflightByKey = new Map<string, Promise<void>>()

function startWarm(queryKey: string, filters: ListingsQueryFilters): void {
  if (!isSupabaseConfigured) return
  const key = cacheKey(queryKey)
  const mem = memory.get(key)
  if (mem && Date.now() - mem.at < MEMORY_TTL_MS) return
  if (warmInflightByKey.has(key)) return

  const inflight = fetchListingsBrowse(filters)
    .then((result) => {
      writeListingsBrowseCache(queryKey, result)
      rememberListingsPrefetch(queryKey, filters)
    })
    .catch(() => {
      /* ignore — page will retry */
    })
    .finally(() => {
      warmInflightByKey.delete(key)
    })
  warmInflightByKey.set(key, inflight)
}

/** Remember last successful listings URL so header prefetch can match date filters, etc. */
export function rememberListingsPrefetch(queryKey: string, filters: ListingsQueryFilters): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(
      LAST_PREFETCH_KEY,
      JSON.stringify({ queryKey, filters, at: Date.now() }),
    )
  } catch {
    /* quota */
  }
}

/** Prefetch the user's last listings search (e.g. with move-in dates) from a prior visit. */
export function warmRememberedListingsBrowseCache(): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    const raw = sessionStorage.getItem(LAST_PREFETCH_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as {
      queryKey?: string
      filters?: ListingsQueryFilters
      at?: number
    }
    if (!parsed.filters || !parsed.at || Date.now() - parsed.at > STORAGE_TTL_MS) return
    startWarm(parsed.queryKey ?? '', parsed.filters)
  } catch {
    /* ignore */
  }
}

/** Start listings query early (nav hover / app idle) so /listings can paint from cache. */
export function warmListingsBrowseCache(
  filters: ListingsQueryFilters = DEFAULT_LISTINGS_BROWSE_FILTERS,
  queryKey = '',
): void {
  startWarm(queryKey, filters)
  warmRememberedListingsBrowseCache()
}
