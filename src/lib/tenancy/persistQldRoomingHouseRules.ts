import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../database.types'
import {
  isMissingQldRoomingHouseRulesColumn,
  toQldRoomingHouseRulesStored,
  type QldHouseRuleExtras,
} from './qldHouseRules'

export async function persistQldRoomingHouseRulesColumn(
  client: SupabaseClient<Database>,
  propertyId: string,
  payload: { commonAreas: string; extras: QldHouseRuleExtras } | null,
): Promise<void> {
  const value = payload
    ? (toQldRoomingHouseRulesStored(payload.commonAreas, payload.extras) as unknown as Json)
    : null
  const { error } = await client
    .from('properties')
    .update({ qld_rooming_house_rules: value })
    .eq('id', propertyId)
  if (!error) return
  if (isMissingQldRoomingHouseRulesColumn(error)) return
  throw error
}
