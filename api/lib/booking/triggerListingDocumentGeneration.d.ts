import type { SupabaseClient } from '@supabase/supabase-js'

export type TriggerListingDocResult =
  | { ok: true; skipped: true; reason: string }
  | { ok: true; skipped?: false; status: number; generatePath: string; deferSigning: boolean }
  | { ok: false; status: number; body: string }

export function triggerListingDocumentGeneration(args: {
  admin: SupabaseClient
  bookingId: string
  deferSigning: boolean
  logger?: Pick<Console, 'warn' | 'error'>
}): Promise<TriggerListingDocResult>
