import { supabase } from './supabase'
import type { Property } from './listings'
import { applyPropertyListingDateWindow, listingIsoDateUtc } from './propertyListingDateWindow'

export type RelatedListingsMode = 'rent' | 'newest' | 'furnished'

const select = `
  *,
  landlord_profiles ( id, full_name, avatar_url, verified ),
  universities ( id, name, slug ),
  campuses ( id, name )
`

export async function fetchRelatedListings(mode: RelatedListingsMode): Promise<Property[]> {
  let query = applyPropertyListingDateWindow(
    supabase.from('properties').select(select),
    listingIsoDateUtc(),
  ).eq('status', 'active')

  if (mode === 'rent') {
    query = query.eq('listing_type', 'rent')
  }
  if (mode === 'furnished') {
    query = query.eq('furnished', true)
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(3)

  if (error) throw error
  return (data ?? []) as Property[]
}
