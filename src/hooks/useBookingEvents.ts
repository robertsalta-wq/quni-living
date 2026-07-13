import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { BookingEventRow } from '../lib/booking/bookingActivityTimeline'

export type UseBookingEventsResult = {
  events: BookingEventRow[]
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Load booking_events for one booking. RLS enforces landlord/admin/student visibility.
 * Pass audienceBothOnly=true for renter surfaces (defence in depth; RLS already filters).
 */
export function useBookingEvents(
  bookingId: string | null | undefined,
  options: { audienceBothOnly?: boolean; enabled?: boolean } = {},
): UseBookingEventsResult {
  const { audienceBothOnly = false, enabled = true } = options
  const [events, setEvents] = useState<BookingEventRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    if (!enabled || !bookingId || !isSupabaseConfigured) {
      setEvents([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      let q = supabase
        .from('booking_events')
        .select(
          'id, booking_id, landlord_id, student_id, event_type, occurred_at, created_at, audience, outcome, actor_type, actor_id, actor_label, changes, reason, provider, provider_ref, correlation_id, document_id, metadata, schema_version',
        )
        .eq('booking_id', bookingId)
        .order('occurred_at', { ascending: false })

      if (audienceBothOnly) {
        q = q.eq('audience', 'both')
      }

      const { data, error: fetchError } = await q
      if (cancelled) return
      if (fetchError) {
        setEvents([])
        setError(fetchError.message || 'Could not load activity.')
        setLoading(false)
        return
      }
      setEvents((data ?? []) as BookingEventRow[])
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [bookingId, audienceBothOnly, enabled, tick])

  return { events, loading, error, reload }
}
