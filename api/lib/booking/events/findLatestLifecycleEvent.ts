/**
 * Dual-read helpers for Stage 6 operational queries.
 *
 * New lifecycle rows land only on booking_events (no dual-write).
 * Historical STE rows remain the source for pre-cutover markers — read
 * booking_events first, then fall back to STE so cooldown / PI recovery /
 * expiry-refund warnings keep working across the cut.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export type LifecycleEventLookup = {
  found: boolean
  /** Prefer booking_events.created_at / STE.created_at (when Quni recorded). */
  createdAt: string | null
  metadata: Record<string, unknown> | null
  source: 'booking_events' | 'service_tier_events' | null
}

function asMeta(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

/**
 * Latest lifecycle event for a booking, checking booking_events then STE.
 */
export async function findLatestLifecycleEvent(
  admin: SupabaseClient,
  args: {
    bookingId: string
    bookingEventType: string
    steEventType: string
  },
): Promise<LifecycleEventLookup> {
  const bookingId = String(args.bookingId || '').trim()
  if (!bookingId) {
    return { found: false, createdAt: null, metadata: null, source: null }
  }

  const { data: beRow, error: beErr } = await admin
    .from('booking_events')
    .select('created_at, metadata')
    .eq('booking_id', bookingId)
    .eq('event_type', args.bookingEventType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (beErr) throw beErr
  if (beRow?.created_at) {
    return {
      found: true,
      createdAt: beRow.created_at,
      metadata: asMeta(beRow.metadata),
      source: 'booking_events',
    }
  }

  const { data: steRow, error: steErr } = await admin
    .from('service_tier_events')
    .select('created_at, metadata')
    .eq('booking_id', bookingId)
    .eq('event_type', args.steEventType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (steErr) throw steErr
  if (steRow?.created_at) {
    return {
      found: true,
      createdAt: steRow.created_at,
      metadata: asMeta(steRow.metadata),
      source: 'service_tier_events',
    }
  }

  return { found: false, createdAt: null, metadata: null, source: null }
}

export function stripePaymentIntentIdFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (!metadata) return null
  const raw = metadata.stripe_payment_intent_id
  if (typeof raw !== 'string') return null
  const id = raw.trim()
  return id || null
}
