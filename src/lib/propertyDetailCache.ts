import type { Property } from './listings'
import { PROPERTY_DETAIL_SELECT } from './propertyDetailSelect'
import { isSupabaseConfigured, supabase } from './supabase'

const MEMORY_TTL_MS = 5 * 60 * 1000

type CacheEntry = {
  at: number
  property: Property
}

const memory = new Map<string, CacheEntry>()
const inflightBySlug = new Map<string, Promise<Property | null>>()

function isFresh(entry: CacheEntry | undefined): entry is CacheEntry {
  return Boolean(entry && Date.now() - entry.at < MEMORY_TTL_MS)
}

export function peekPropertyDetailCache(slug: string): Property | null {
  const key = slug.trim()
  if (!key) return null
  const entry = memory.get(key)
  return isFresh(entry) ? entry.property : null
}

export function writePropertyDetailCache(slug: string, property: Property): void {
  const key = slug.trim()
  if (!key) return
  memory.set(key, { at: Date.now(), property })
}

async function fetchPropertyDetailBySlug(slug: string, abortSignal?: AbortSignal): Promise<Property | null> {
  if (abortSignal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError')
  }

  let query = supabase.from('properties').select(PROPERTY_DETAIL_SELECT).eq('slug', slug)

  if (abortSignal) {
    query = query.abortSignal(abortSignal)
  }

  const { data, error } = await query.maybeSingle()

  if (error) throw error
  if (!data) return null
  return data as Property
}

/** Start detail fetch early (card hover) so navigation can paint from cache. */
export function prefetchPropertyDetail(slug: string): void {
  const key = slug.trim()
  if (!key || !isSupabaseConfigured) return
  if (isFresh(memory.get(key))) return
  if (inflightBySlug.has(key)) return

  const inflight = fetchPropertyDetailBySlug(key)
    .then((property) => {
      if (property) writePropertyDetailCache(key, property)
      return property
    })
    .catch(() => null)
    .finally(() => {
      inflightBySlug.delete(key)
    })

  inflightBySlug.set(key, inflight)
}

export async function loadPropertyDetailBySlug(
  slug: string,
  options?: { abortSignal?: AbortSignal },
): Promise<Property | null> {
  const key = slug.trim()
  if (!key || !isSupabaseConfigured) return null

  const cached = peekPropertyDetailCache(key)
  if (cached) return cached

  const abortSignal = options?.abortSignal
  if (abortSignal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError')
  }

  if (!abortSignal) {
    const existing = inflightBySlug.get(key)
    if (existing) return existing
  }

  const inflight = fetchPropertyDetailBySlug(key, abortSignal)
    .then((property) => {
      if (property) writePropertyDetailCache(key, property)
      return property
    })
    .finally(() => {
      if (!abortSignal) {
        inflightBySlug.delete(key)
      }
    })

  if (!abortSignal) {
    inflightBySlug.set(key, inflight)
  }
  return inflight
}
