import type { SupabaseClient } from '@supabase/supabase-js'
import {
  resolveTenancyPackage,
  tenancyPackageInputFromBooking,
  type SupportedTenancyPackageResult,
  type TenancyPackageInput,
} from '../../resolveTenancyPackage.js'

const PINNED_SIGNING_PACKAGE: Record<string, TenancyPackageInput> = {
  residential_tenancy: {
    state: 'NSW',
    property_type: 'private_room_landlord_off_site',
    is_registered_rooming_house: false,
  },
  residential_tenancy_qld: {
    state: 'QLD',
    property_type: 'entire_property',
    is_registered_rooming_house: false,
    shares_kitchen_or_bathroom: false,
  },
  residential_tenancy_vic: {
    state: 'VIC',
    property_type: 'entire_property',
    is_registered_rooming_house: false,
  },
  rooming_accommodation_qld: {
    state: 'QLD',
    property_type: 'private_room_landlord_off_site',
    is_registered_rooming_house: false,
    shares_kitchen_or_bathroom: true,
  },
  rooming_house_vic: {
    state: 'VIC',
    property_type: 'private_room_landlord_off_site',
    is_registered_rooming_house: false,
    vic_premises_occupant_capacity: 4,
  },
}

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
      properties ( state, property_type, is_registered_rooming_house, rooms_rented_to_residents, qld_shares_kitchen_or_bathroom )
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

  const prop: Record<string, unknown> =
    booking.properties && typeof booking.properties === 'object' && !Array.isArray(booking.properties)
      ? { ...(booking.properties as Record<string, unknown>) }
      : {}

  const propertyState = typeof prop.state === 'string' ? prop.state.trim().toUpperCase() : ''
  if (propertyState === 'VIC') {
    const { data: vicRow, error: vicErr } = await admin
      .from('properties')
      .select('vic_premises_occupant_capacity')
      .eq('id', booking.property_id)
      .maybeSingle()
    if (vicErr) {
      return {
        ok: false,
        status: 503,
        error: 'Victorian rooming house columns are not available yet. Apply the migration before generating this agreement.',
      }
    }
    prop.vic_premises_occupant_capacity = vicRow?.vic_premises_occupant_capacity ?? null
  }

  const pinned = await pinnedSigningPackage(admin, bookingId)
  if (pinned) {
    const pinnedPackage = resolveTenancyPackage(pinned)
    if (pinnedPackage.supported) {
      return { ok: true, generator: pinnedPackage.generator, package: pinnedPackage }
    }
  }

  const tenancyInput = tenancyPackageInputFromBooking(booking, prop)
  const tenancyPackage = resolveTenancyPackage(tenancyInput)

  if (!tenancyPackage.supported) {
    return {
      ok: false,
      status: 400,
      error: tenancyPackage.unsupportedReason || 'Tenancy agreement not supported for this property',
    }
  }

  return { ok: true, generator: tenancyPackage.generator, package: tenancyPackage }
}

async function pinnedSigningPackage(
  admin: SupabaseClient,
  bookingId: string,
): Promise<TenancyPackageInput | null> {
  const { data: tenancy } = await admin
    .from('tenancies')
    .select('id')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!tenancy?.id) return null
  const { data: doc } = await admin
    .from('tenancy_documents')
    .select('status, metadata')
    .eq('tenancy_id', tenancy.id)
    .eq('document_type', 'residential_tenancy')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!doc || (doc.status !== 'signed' && doc.status !== 'sent_for_signing')) return null
  const meta = doc.metadata && typeof doc.metadata === 'object' && !Array.isArray(doc.metadata) ? doc.metadata : {}
  const signingPackage = typeof (meta as { signing_package?: unknown }).signing_package === 'string'
    ? (meta as { signing_package: string }).signing_package
    : ''
  return PINNED_SIGNING_PACKAGE[signingPackage] ?? null
}
