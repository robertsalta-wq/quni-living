import type { SupabaseClient } from '@supabase/supabase-js'

export type ListingEmailAttemptLookup = {
  /** Extra metadata keys that must also be present on the attempt, such as a submission id. */
  metadata?: Record<string, string>
  /**
   * When true, a lookup error throws instead of allowing another send.
   * Agreement-ready mail stays fail-open (the default) so a lookup blip can still send once.
   */
  failClosed?: boolean
}

/**
 * True when this booking already has an email.attempt for the template.
 * A lookup error returns false so a send is not blocked, unless failClosed is set.
 */
export async function listingEmailAttemptExists(
  admin: SupabaseClient,
  bookingId: string,
  templateKey: string,
  lookup?: ListingEmailAttemptLookup,
): Promise<boolean> {
  const metadata = {
    template_key: templateKey,
    ...(lookup?.metadata ?? {}),
  }
  const { data, error } = await admin
    .from('booking_events')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('event_type', 'email.attempt')
    .contains('metadata', metadata)
    .limit(1)

  if (error) {
    console.error('[listing-emails] attempt lookup', templateKey, error)
    if (lookup?.failClosed) {
      throw new Error(`email.attempt lookup failed for ${templateKey}`)
    }
    return false
  }
  return Array.isArray(data) && data.length > 0
}
