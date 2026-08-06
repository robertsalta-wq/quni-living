import type { SupabaseClient } from '@supabase/supabase-js'
import { AGREEMENT_HOLDING_STATUSES } from './types.js'

export type GroupOverlapResult =
  | { ok: true }
  | {
      ok: false
      status: number
      code: string
      message: string
      conflictingBookingId?: string
    }

/**
 * Block a student from holding two live/reserved agreements on the same
 * property_group (sibling rooms) or the same property_id.
 * Exclude `excludeBookingId` (the booking being created or the one terminating into a new deal).
 */
export async function assertNoPropertyGroupDoubleHold(args: {
  admin: SupabaseClient
  studentId: string
  propertyId: string
  excludeBookingId?: string | null
  /** When set, a sibling `terminating` booking is allowed if its effective date is on/before this start. */
  newStartDate?: string | null
}): Promise<GroupOverlapResult> {
  const { admin, studentId, propertyId, excludeBookingId, newStartDate } = args
  const newStart =
    typeof newStartDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(newStartDate.trim())
      ? newStartDate.trim()
      : null
  const sid = typeof studentId === 'string' ? studentId.trim() : ''
  const pid = typeof propertyId === 'string' ? propertyId.trim() : ''
  if (!sid || !pid) {
    return { ok: false, status: 400, code: 'missing_ids', message: 'Student and property are required.' }
  }

  const { data: prop, error: pErr } = await admin
    .from('properties')
    .select('id, property_group_id')
    .eq('id', pid)
    .maybeSingle()

  if (pErr) {
    console.error('[propertyGroupOverlap] load property', pErr)
    return { ok: false, status: 500, code: 'db_error', message: 'Could not check availability.' }
  }
  if (!prop) {
    return { ok: false, status: 404, code: 'property_not_found', message: 'Property not found.' }
  }

  const groupId =
    typeof prop.property_group_id === 'string' && prop.property_group_id.trim()
      ? prop.property_group_id.trim()
      : null

  let propertyIds: string[] = [pid]
  if (groupId) {
    const { data: siblings, error: sErr } = await admin
      .from('properties')
      .select('id')
      .eq('property_group_id', groupId)
    if (sErr) {
      console.error('[propertyGroupOverlap] load siblings', sErr)
      return { ok: false, status: 500, code: 'db_error', message: 'Could not check availability.' }
    }
    propertyIds = (siblings ?? []).map((r) => r.id).filter(Boolean)
    if (!propertyIds.includes(pid)) propertyIds.push(pid)
  }

  let q = admin
    .from('bookings')
    .select('id, property_id, status, termination_effective_date, termination_acknowledged_at')
    .eq('student_id', sid)
    .in('property_id', propertyIds)
    .in('status', [...AGREEMENT_HOLDING_STATUSES])
    .limit(10)

  if (excludeBookingId) {
    q = q.neq('id', excludeBookingId)
  }

  const { data: rows, error: bErr } = await q
  if (bErr) {
    console.error('[propertyGroupOverlap] load bookings', bErr)
    return { ok: false, status: 500, code: 'db_error', message: 'Could not check availability.' }
  }

  for (const hit of rows ?? []) {
    if (
      hit.status === 'terminating' &&
      newStart &&
      typeof hit.termination_effective_date === 'string' &&
      hit.termination_acknowledged_at &&
      hit.termination_effective_date <= newStart
    ) {
      // Prior agreement ends on/before new start - allowed (Kim same-day convert).
      continue
    }
    return {
      ok: false,
      status: 409,
      code: 'property_group_double_hold',
      message:
        'This tenant already holds a live agreement on this unit or a sibling room. End that agreement (effective date reached) before confirming a new one.',
      conflictingBookingId: hit.id,
    }
  }

  return { ok: true }
}
