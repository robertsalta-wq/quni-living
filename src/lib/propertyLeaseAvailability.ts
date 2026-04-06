import type { SupabaseClient } from '@supabase/supabase-js'

/** Uses RPC (security definer) — not visible under normal bookings RLS. */
export async function fetchUnavailablePropertyIdsForDateRange(
  client: SupabaseClient,
  propertyIds: string[],
  moveInDate: string,
  moveOutDate: string | null,
  excludeStudentProfileId: string | null,
): Promise<Set<string>> {
  if (propertyIds.length === 0) return new Set()
  if (!moveInDate.trim()) return new Set()

  const args: {
    p_property_ids: string[]
    p_move_in_date: string
    p_move_out_date?: string | null
    p_exclude_student_id?: string | null
  } = {
    p_property_ids: propertyIds,
    p_move_in_date: moveInDate.trim().slice(0, 10),
  }
  if (moveOutDate && moveOutDate.trim()) {
    args.p_move_out_date = moveOutDate.trim().slice(0, 10)
  }
  if (excludeStudentProfileId) {
    args.p_exclude_student_id = excludeStudentProfileId
  }

  const { data, error } = await client.rpc('property_availability_check', args)
  if (error) {
    console.warn('[propertyLeaseAvailability] property_availability_check RPC failed', error.message)
    return new Set()
  }
  const arr = Array.isArray(data) ? data : []
  return new Set(arr.filter((id): id is string => typeof id === 'string' && id.length > 0))
}
