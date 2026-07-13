import type { SupabaseClient } from '@supabase/supabase-js'
import type { BookingEventActorType } from './types.js'

/**
 * Columns watched by trg_bookings_log_booking_events (Stage 3).
 * Keep in sync with 20260713170000_booking_events_status_spine.sql.
 */
export const BOOKING_EVENT_TRIGGER_WATCHED_COLUMNS = [
  'status',
  'listing_agreement_status',
  'bond_received_by_landlord_at',
  'booking_fee_paid',
  'expired_at',
  'declined_at',
] as const

export type BookingEventTriggerWatchedColumn =
  (typeof BOOKING_EVENT_TRIGGER_WATCHED_COLUMNS)[number]

export type SetBookingEventActorInput = {
  actorType?: BookingEventActorType
  actorId?: string | null
  actorLabel?: string | null
}

/**
 * Sets transaction-local actor vars for the bookings → booking_events trigger.
 *
 * IMPORTANT: With the Supabase HTTP client, each `.from()` / `.rpc()` call is its
 * own request/transaction. Calling this immediately before `.from('bookings').update()`
 * does NOT attach the actor to that update. Use only inside a single SQL transaction
 * (e.g. a SECURITY DEFINER RPC that set_config + UPDATE together), or rely on
 * recordBookingEvent domain rows for actor labels.
 */
export async function setBookingEventActor(
  admin: SupabaseClient,
  input: SetBookingEventActorInput = {},
): Promise<{ ok: true } | { ok: false; error: unknown; message: string }> {
  const { error } = await admin.rpc('set_booking_event_actor', {
    p_actor_type: input.actorType ?? 'system',
    p_actor_id: input.actorId ?? null,
    p_actor_label: input.actorLabel ?? null,
  })

  if (error) {
    return {
      ok: false,
      error,
      message: error.message || 'set_booking_event_actor failed',
    }
  }
  return { ok: true }
}
