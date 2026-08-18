/**
 * Durable Search Console response cache (Supabase).
 * TTL baked into expires_at at write (12h). No in-memory layer.
 * Graceful: if the table/client is unavailable, callers fall through to Google.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  SEARCH_ANALYTICS_ROW_LIMIT,
  SEARCH_CONSOLE_SITE_URL,
  searchConsoleRange28d,
} from './googleSearchConsole.js'

export const SEARCH_CONSOLE_CACHE_TTL_MS = 12 * 60 * 60 * 1000
export const SEARCH_CONSOLE_CACHE_KEY_VERSION = 'v1'

export type SearchConsoleCacheDataset = 'summary' | 'queries' | 'pages'

export type CachedRow<T> = {
  payload: T
  fetchedAt: string
  expiresAt: string
  fresh: boolean
}

function getServiceRoleClient(): SupabaseClient | null {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!supabaseUrl || !serviceRole) return null
  return createClient(supabaseUrl, serviceRole)
}

/**
 * searchconsole:v1:{dataset}:{property}:{startDate}:{endDate}:{dimension}:{rowLimit}
 * Daily date rollover is intentional (rolling 28d window).
 */
export function buildSearchConsoleCacheKey(dataset: SearchConsoleCacheDataset): string {
  const { startDate, endDate } = searchConsoleRange28d()
  const property = SEARCH_CONSOLE_SITE_URL
  if (dataset === 'summary') {
    return [
      'searchconsole',
      SEARCH_CONSOLE_CACHE_KEY_VERSION,
      'summary',
      property,
      startDate,
      endDate,
      'agg',
      'n-a',
    ].join(':')
  }
  const dimension = dataset === 'queries' ? 'query' : 'page'
  return [
    'searchconsole',
    SEARCH_CONSOLE_CACHE_KEY_VERSION,
    dataset,
    property,
    startDate,
    endDate,
    dimension,
    String(SEARCH_ANALYTICS_ROW_LIMIT),
  ].join(':')
}

export async function readSearchConsoleCache<T>(cacheKey: string): Promise<CachedRow<T> | null> {
  const supabase = getServiceRoleClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('search_console_cache')
      .select('payload, fetched_at, expires_at')
      .eq('cache_key', cacheKey)
      .maybeSingle()

    if (error || !data) {
      if (error) {
        console.warn('[searchConsoleCache] read failed (table missing or RLS?)', error.message)
      }
      return null
    }

    const expiresMs = new Date(data.expires_at as string).getTime()
    const fresh = Number.isFinite(expiresMs) && expiresMs > Date.now()
    return {
      payload: data.payload as T,
      fetchedAt: data.fetched_at as string,
      expiresAt: data.expires_at as string,
      fresh,
    }
  } catch (e) {
    console.warn('[searchConsoleCache] read threw', e)
    return null
  }
}

export async function writeSearchConsoleCache(cacheKey: string, payload: unknown): Promise<void> {
  const supabase = getServiceRoleClient()
  if (!supabase) return

  const now = Date.now()
  const fetchedAt = new Date(now).toISOString()
  const expiresAt = new Date(now + SEARCH_CONSOLE_CACHE_TTL_MS).toISOString()

  try {
    const { error } = await supabase.from('search_console_cache').upsert(
      {
        cache_key: cacheKey,
        payload,
        fetched_at: fetchedAt,
        expires_at: expiresAt,
      },
      { onConflict: 'cache_key' },
    )
    if (error) {
      console.warn('[searchConsoleCache] write failed', error.message)
      return
    }

    // Opportunistic housekeeping - keep ~20-25 rows with daily key rollover.
    const purgeBefore = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { error: delErr } = await supabase
      .from('search_console_cache')
      .delete()
      .lt('expires_at', purgeBefore)
    if (delErr) {
      console.warn('[searchConsoleCache] purge failed', delErr.message)
    }
  } catch (e) {
    console.warn('[searchConsoleCache] write threw', e)
  }
}
