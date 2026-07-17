import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReinstatementRequestStatus } from './constants.js'

export type ReinstatementRequestRow = {
  id: string
  booking_id: string
  requested_by: string
  requested_by_role: 'landlord' | 'tenant'
  requested_at: string
  grace_window_expires_at: string
  status: ReinstatementRequestStatus
  requested_fee_action: string | null
  confirmed_by: string | null
  confirmed_at: string | null
  fee_action: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

const SELECT_COLS =
  'id, booking_id, requested_by, requested_by_role, requested_at, grace_window_expires_at, status, requested_fee_action, confirmed_by, confirmed_at, fee_action, metadata, created_at, updated_at'

export async function loadPendingReinstatementRequest(
  admin: SupabaseClient,
  bookingId: string,
): Promise<ReinstatementRequestRow | null> {
  const { data, error } = await admin
    .from('booking_reinstatement_requests')
    .select(SELECT_COLS)
    .eq('booking_id', bookingId)
    .eq('status', 'pending_confirmation')
    .maybeSingle()
  if (error) throw error
  return (data as ReinstatementRequestRow | null) ?? null
}

export async function loadLatestReinstatementRequest(
  admin: SupabaseClient,
  bookingId: string,
): Promise<ReinstatementRequestRow | null> {
  const { data, error } = await admin
    .from('booking_reinstatement_requests')
    .select(SELECT_COLS)
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as ReinstatementRequestRow | null) ?? null
}

export async function loadReinstatementRequestById(
  admin: SupabaseClient,
  requestId: string,
): Promise<ReinstatementRequestRow | null> {
  const { data, error } = await admin
    .from('booking_reinstatement_requests')
    .select(SELECT_COLS)
    .eq('id', requestId)
    .maybeSingle()
  if (error) throw error
  return (data as ReinstatementRequestRow | null) ?? null
}

/** Flip pending → window_expired when past grace deadline. Returns updated row. */
export async function lazyExpireReinstatementRequest(
  admin: SupabaseClient,
  row: ReinstatementRequestRow,
  nowIso = new Date().toISOString(),
): Promise<ReinstatementRequestRow> {
  if (row.status !== 'pending_confirmation') return row
  const deadline = new Date(row.grace_window_expires_at).getTime()
  if (!Number.isFinite(deadline) || Date.now() < deadline) return row

  const { data, error } = await admin
    .from('booking_reinstatement_requests')
    .update({ status: 'window_expired', updated_at: nowIso })
    .eq('id', row.id)
    .eq('status', 'pending_confirmation')
    .select(SELECT_COLS)
    .maybeSingle()

  if (error) throw error
  if (data) return data as ReinstatementRequestRow
  // Concurrent updater already changed status — reload
  const again = await loadReinstatementRequestById(admin, row.id)
  return again ?? { ...row, status: 'window_expired', updated_at: nowIso }
}
