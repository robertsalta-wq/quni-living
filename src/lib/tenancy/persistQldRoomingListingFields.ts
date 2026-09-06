import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'
import {
  isMissingQldRoomingListingColumn,
  type QldRoomingListingColumnPatch,
} from './qldRoomingListingFields'

export async function persistQldRoomingListingColumns(
  client: SupabaseClient<Database>,
  propertyId: string,
  patch: QldRoomingListingColumnPatch,
): Promise<void> {
  const { error } = await client.from('properties').update(patch).eq('id', propertyId)
  if (!error) return
  if (isMissingQldRoomingListingColumn(error)) return
  throw error
}
