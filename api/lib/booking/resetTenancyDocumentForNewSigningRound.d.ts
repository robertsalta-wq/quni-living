import type { SupabaseClient } from '@supabase/supabase-js'

export function resetTenancyDocumentForNewSigningRound(
  admin: SupabaseClient,
  bookingId: string,
): Promise<
  | { ok: true; reset: false; reason: string }
  | { ok: true; reset: true; documentId: string; previousStatus: string }
  | { ok: false; reason: string }
>
