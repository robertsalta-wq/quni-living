import type { SupabaseClient } from '@supabase/supabase-js'

/** True when this booking already has an email.attempt for the template. A lookup error returns false so a send is not blocked. */
export async function listingEmailAttemptExists(
  admin: SupabaseClient,
  bookingId: string,
  templateKey: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from('booking_events')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('event_type', 'email.attempt')
    .contains('metadata', { template_key: templateKey })
    .limit(1)

  if (error) {
    console.error('[listing-emails] attempt lookup', templateKey, error)
    return false
  }
  return Array.isArray(data) && data.length > 0
}
