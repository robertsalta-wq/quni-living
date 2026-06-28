import type { SupabaseClient } from '@supabase/supabase-js'

export function siteBaseUrl(): string

export function sendListingBookingAcceptedEmails(
  admin: SupabaseClient,
  bookingId: string,
  opts: { bond_window_expires_at: string },
): Promise<void>

export function sendListingAgreementReadyEmails(admin: SupabaseClient, bookingId: string): Promise<void>

export function sendListingBondReceivedEmails(admin: SupabaseClient, bookingId: string): Promise<void>

export function sendListingBondPendingExpiredEmails(
  admin: SupabaseClient,
  bookingRow: Record<string, unknown>,
  refundMeta: { refund_id?: string | null; refund_amount_cents?: number | null },
): Promise<void>

export function sendListingCancelledByLandlordEmails(
  admin: SupabaseClient,
  bookingId: string,
  meta: { cancellation_reason?: string | null },
): Promise<void>

export function buildListingRenterPaymentEmailPayload(
  ctx: Record<string, unknown>,
  opts: { bondDeadlineDisplay: string; studentDashboardUrl?: string; bookingReference?: string },
): Record<string, unknown>

export function sendListingPaymentInstructionsRenter(
  admin: SupabaseClient,
  bookingId: string,
): Promise<{ ok: true } | { ok: false; code: string; message: string }>
