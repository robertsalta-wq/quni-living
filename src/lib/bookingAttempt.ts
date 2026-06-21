import { apiUrl } from './apiUrl'
import { supabase } from './supabase'

/** Mint once per booking page visit; correlates journey_events for one attempt. */
export function mintBookingAttemptId(): string {
  return crypto.randomUUID()
}

/**
 * Fire-and-forget: records booking_page_opened on the server.
 * Requires an authenticated session.
 */
export function recordBookingPageOpened(attemptId: string, propertyId: string): void {
  const id = attemptId.trim()
  const pid = propertyId.trim()
  if (!id || !pid) return

  void (async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) return

      await fetch(apiUrl('/api/booking-attempt'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ attempt_id: id, property_id: pid }),
      })
    } catch {
      /* telemetry must not affect booking UX */
    }
  })()
}
