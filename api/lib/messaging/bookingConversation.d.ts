import type { SupabaseClient } from '@supabase/supabase-js'

export function unlockConversationOnBookingConfirmed(
  admin: SupabaseClient,
  bookingId: string,
  opts: { landlordUserId: string | null },
): Promise<void>
