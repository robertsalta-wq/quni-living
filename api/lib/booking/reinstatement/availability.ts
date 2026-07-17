import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns true when another confirmed/active booking holds the property
 * for overlapping dates (property_availability_check RPC).
 */
export async function isPropertyBlockedForReinstatement(
  admin: SupabaseClient,
  args: {
    propertyId: string | null
    moveInDate: string | null
    startDate: string | null
    endDate: string | null
    excludeStudentId: string | null
  },
): Promise<{ blocked: boolean; error?: string }> {
  const propertyId = args.propertyId?.trim() || ''
  if (!propertyId) {
    return { blocked: false }
  }

  const moveIn = (args.moveInDate || args.startDate || '').trim().slice(0, 10)
  if (!moveIn) {
    // Without dates we cannot safely check overlap — fail closed.
    return { blocked: true, error: 'missing_move_in_date' }
  }

  const moveOut = (args.endDate || '').trim().slice(0, 10) || null

  const rpcArgs: {
    p_property_ids: string[]
    p_move_in_date: string
    p_move_out_date?: string | null
    p_exclude_student_id?: string | null
  } = {
    p_property_ids: [propertyId],
    p_move_in_date: moveIn,
  }
  if (moveOut) rpcArgs.p_move_out_date = moveOut
  if (args.excludeStudentId) rpcArgs.p_exclude_student_id = args.excludeStudentId

  const { data, error } = await admin.rpc('property_availability_check', rpcArgs)
  if (error) {
    console.error('[reinstatement] property_availability_check', error.message)
    return { blocked: true, error: error.message }
  }
  const unavailable = Array.isArray(data) ? data : []
  return { blocked: unavailable.some((id) => id === propertyId) }
}
