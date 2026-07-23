/**
 * Active, publicly browsable listings for sitemap + build-time prerender.
 */
import { createClient } from '@supabase/supabase-js'
import type { Property } from './listings'
import { PROPERTY_DETAIL_SELECT } from './propertyDetailSelect'
import {
  applyPropertyListingDateWindow,
  listingIsoDateUtc,
} from './propertyListingDateWindow'
import { getSupabaseEnvAnonKey, getSupabaseEnvUrl } from './supabaseConfigured'

export type PublishedListingSlugRow = {
  slug: string
  updated_at: string | null
}

function createAnonClient() {
  const url = getSupabaseEnvUrl()
  const key = getSupabaseEnvAnonKey()
  if (!url || !key) return null
  return createClient(url, key)
}

/** Active listings still inside the browse date window (not past available_to). */
export async function listPublishedListingSlugRows(): Promise<PublishedListingSlugRow[]> {
  const supabase = createAnonClient()
  if (!supabase) return []

  const day = listingIsoDateUtc()
  let query = supabase.from('properties').select('slug, updated_at').eq('status', 'active')
  query = applyPropertyListingDateWindow(query, day)

  const { data, error } = await query.order('updated_at', { ascending: false })
  if (error || !data) {
    if (error) console.error('[publishedListings] slug query failed:', error.message)
    return []
  }

  return data.filter(
    (p): p is PublishedListingSlugRow =>
      typeof p.slug === 'string' && p.slug.trim().length > 0,
  )
}

/** Full detail rows for prerender cache seed (PROPERTY_DETAIL_SELECT). */
export async function fetchPublishedListingDetails(): Promise<Property[]> {
  const supabase = createAnonClient()
  if (!supabase) return []

  const day = listingIsoDateUtc()
  let query = supabase.from('properties').select(PROPERTY_DETAIL_SELECT).eq('status', 'active')
  query = applyPropertyListingDateWindow(query, day)

  const { data, error } = await query.order('slug', { ascending: true })
  if (error || !data) {
    if (error) console.error('[publishedListings] detail query failed:', error.message)
    return []
  }

  return (data as Property[]).filter(
    (p) => typeof p.slug === 'string' && p.slug.trim().length > 0,
  )
}

export function listingPrerenderPaths(slugs: string[]): string[] {
  return slugs
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `/listings/${s}`)
}
