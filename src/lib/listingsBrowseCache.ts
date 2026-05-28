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

let warmInflight: Promise<void> | null = null

/** Start the default listings query early (nav hover / app idle) so /listings can paint from cache. */
export function warmListingsBrowseCache(filters: ListingsQueryFilters = DEFAULT_LISTINGS_BROWSE_FILTERS): void {
  if (!isSupabaseConfigured) return
  const key = cacheKey('')
  if (memory.get(key) && Date.now() - memory.get(key)!.at < MEMORY_TTL_MS) return
  if (warmInflight) return
  warmInflight = fetchListingsBrowse(filters)
    .then((result) => {
      writeListingsBrowseCache('', result)
    })
    .catch(() => {
      /* ignore — page will retry */
    })
    .finally(() => {
      warmInflight = null
    })
}
