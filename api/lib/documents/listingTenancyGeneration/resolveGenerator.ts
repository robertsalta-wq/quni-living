import type { SupabaseClient } from '@supabase/supabase-js'
import {
  resolveTenancyPackage,
  tenancyPackageInputFromBooking,
  type SupportedTenancyPackageResult,
} from '../../resolveTenancyPackage.js'

export type ResolvedListingGenerator =
  | { ok: true; generator: string; package: SupportedTenancyPackageResult }
  | { ok: false; status: number; error: string; detail?: string }

export async function resolveListingTenancyGenerator(
  admin: SupabaseClient,
  bookingId: string,
): Promise<ResolvedListingGenerator> {
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(
      `
      id,
      property_id,
      move_in_date,
      properties ( state, property_type, is_registered_rooming_house )
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (bErr || !booking) {
    return { ok: false, status: 404, error: 'Booking not found' }
  }
  if (!booking.property_id) {
    return { ok: false, status: 400, error: 'Booking missing property' }
  }

  const prop =
    booking.properties && typeof booking.properties === 'object' && !Array.isArray(booking.properties)
      ? booking.properties
      : {}

  const tenancyInput = tenancyPackageInputFromBooking(booking, prop)
  const tenancyPackage = resolveTenancyPackage(tenancyInput)

  if (!tenancyPackage.supported) {
    return {
      ok: false,
      status: 400,
      error: 'Tenancy agreement not supported for this property',
      detail: tenancyPackage.unsupportedReason ?? undefined,
    }
  }

  return { ok: true, generator: tenancyPackage.generator, package: tenancyPackage }
}
