import type { SupabaseClient } from '@supabase/supabase-js'

export type BookingPartyRole = 'landlord' | 'tenant'

export type PartyOfBooking = {
  role: BookingPartyRole
  authUserId: string
  landlordProfileId: string | null
  studentProfileId: string | null
  booking: {
    id: string
    status: string
    landlord_id: string | null
    student_id: string | null
    property_id: string | null
    service_tier_final: string | null
    expired_at: string | null
    bond_received_by_landlord_at: string | null
    listing_agreement_status: string | null
    move_in_date: string | null
    start_date: string | null
    end_date: string | null
  }
}

export type AssertPartyResult =
  | { ok: true; party: PartyOfBooking }
  | { ok: false; status: 401 | 403 | 404; error: string }

/**
 * Resolve whether auth user is the booking's landlord or primary tenant.
 * Co-tenants are not parties for reinstatement v1.
 */
export async function assertPartyOfBooking(
  admin: SupabaseClient,
  authUserId: string,
  bookingId: string,
): Promise<AssertPartyResult> {
  const id = typeof bookingId === 'string' ? bookingId.trim() : ''
  if (!id) {
    return { ok: false, status: 404, error: 'Booking not found' }
  }

  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(
      'id, status, landlord_id, student_id, property_id, service_tier_final, expired_at, bond_received_by_landlord_at, listing_agreement_status, move_in_date, start_date, end_date',
    )
    .eq('id', id)
    .maybeSingle()

  if (bErr) {
    console.error('[assertPartyOfBooking] booking', bErr.message)
    return { ok: false, status: 404, error: 'Booking not found' }
  }
  if (!booking) {
    return { ok: false, status: 404, error: 'Booking not found' }
  }

  const [{ data: lp }, { data: sp }] = await Promise.all([
    admin.from('landlord_profiles').select('id').eq('user_id', authUserId).maybeSingle(),
    admin.from('student_profiles').select('id').eq('user_id', authUserId).maybeSingle(),
  ])

  const landlordProfileId = lp?.id ?? null
  const studentProfileId = sp?.id ?? null
  const isLandlord = Boolean(landlordProfileId && booking.landlord_id === landlordProfileId)
  const isTenant = Boolean(studentProfileId && booking.student_id === studentProfileId)

  if (!isLandlord && !isTenant) {
    return { ok: false, status: 403, error: 'Forbidden' }
  }

  return {
    ok: true,
    party: {
      role: isLandlord ? 'landlord' : 'tenant',
      authUserId,
      landlordProfileId,
      studentProfileId,
      booking: {
        id: booking.id,
        status: booking.status,
        landlord_id: booking.landlord_id,
        student_id: booking.student_id,
        property_id: booking.property_id,
        service_tier_final: booking.service_tier_final,
        expired_at: booking.expired_at,
        bond_received_by_landlord_at: booking.bond_received_by_landlord_at,
        listing_agreement_status: booking.listing_agreement_status,
        move_in_date: booking.move_in_date,
        start_date: booking.start_date,
        end_date: booking.end_date,
      },
    },
  }
}
