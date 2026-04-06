import type { SupabaseClient } from '@supabase/supabase-js'

/** Uses RPC (security definer) — not visible under normal bookings RLS. */
export async function fetchPropertyIdsLeasedToOthers(
  client: SupabaseClient,
  propertyIds: string[],
  excludeStudentProfileId: string | null,
): Promise<Set<string>> {
  if (propertyIds.length === 0) return new Set()
  const args: { p_property_ids: string[]; p_exclude_student_id?: string | null } = {
    p_property_ids: propertyIds,
  }
  if (excludeStudentProfileId) {
    args.p_exclude_student_id = excludeStudentProfileId
  }
  const { data, error } = await client.rpc('property_ids_leased_to_others', args)
  if (error) {
    console.warn('[propertyLeaseAvailability] RPC failed', error.message)
    return new Set()
  }
  const arr = Array.isArray(data) ? data : []
  return new Set(arr.filter((id): id is string => typeof id === 'string' && id.length > 0))
}
