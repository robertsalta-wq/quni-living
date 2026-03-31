import { supabase } from './supabase'

/**
 * Notify landlord of a new booking request (Resend, server-side).
 * Call after the booking row is inserted; requires an active student session.
 */
export async function sendBookingRequestToLandlord(bookingId: string): Promise<void> {
  const id = bookingId.trim()
  if (!id) return

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) {
    console.warn('Booking request email skipped: not signed in')
    return
  }

  const res = await fetch('/api/send-booking-request-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ bookingId: id }),
  })

  if (!res.ok) {
    let msg = res.statusText
    try {
      const j = (await res.json()) as { error?: string }
      if (j.error) msg = j.error
    } catch {
      /* ignore */
    }
    console.warn('Booking request email failed:', msg)
  }
}
