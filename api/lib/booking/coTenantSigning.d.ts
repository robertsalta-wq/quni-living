import type { SupabaseClient } from '@supabase/supabase-js'

export function coTenantEmailDistinctFromPrimary(primaryEmail: string, coEmail: string): boolean

export function bookingRequiresCoTenantSignature(booking: {
  co_tenant?: unknown
  occupant_count?: number | null
}): boolean

export function fetchCoTenantSignerForTenancy(
  admin: SupabaseClient,
  tenancyId: string,
): Promise<{ email: string; name: string } | null>

export function fetchCoTenantSignerForBooking(
  admin: SupabaseClient,
  bookingId: string,
): Promise<{ email: string; name: string } | null>
