import type { SupabaseClient } from '@supabase/supabase-js'

import { sendListingBondReceivedEmails } from './listingTransactionalEmails.js'
import { triggerListingDocumentGeneration } from './triggerListingDocumentGeneration.js'
import { declineCompetingBookings } from './declineCompetingBookings.js'

/** Payload returned to clients after mark-bond-received (subset of `bookings`). */
export type MarkBondReceivedBookingPayload = {
  id: string
  status: string
  bond_received_by_landlord_at: string | null
  service_tier_final: string | null
  confirmed_at: string | null
}

export type MarkBondReceivedResult =
  | { ok: true; idempotent: boolean; booking: MarkBondReceivedBookingPayload }
  | { ok: false; status: number; code: string; message: string }

const BOOKING_MARK_SELECT =
  'id, status, bond_received_by_landlord_at, service_tier_final, confirmed_at, landlord_id, student_id, property_id'

function warn(logger: Pick<Console, 'warn'> | undefined, msg: string, err?: unknown) {
  const fn = logger?.warn ?? console.warn
  if (err !== undefined) fn(msg, err)
  else fn(msg)
}

async function listingLeaseSigningAlreadyInitiated(
  admin: SupabaseClient,
  bookingId: string,
): Promise<boolean> {
  const { data: tenancy } = await admin.from('tenancies').select('id').eq('booking_id', bookingId).maybeSingle()
  if (!tenancy?.id) return false
  const { data: docs } = await admin
    .from('tenancy_documents')
    .select('status')
    .eq('tenancy_id', tenancy.id)
  if (!Array.isArray(docs) || docs.length === 0) return false
  return docs.some((d) => {
    const st = typeof d.status === 'string' ? d.status : ''
    return st === 'sent_for_signing' || st === 'signed'
  })
}

/**
 * Landlord self-report: bond received off-platform → `confirmed` + telemetry.
 * Does not modify `confirmed_at` (set at landlord-accept / listing fee step).
 */
export async function runMarkBondReceivedLandlord(args: {
  admin: SupabaseClient
  landlordProfileId: string
  bookingId: string
  logger?: Pick<Console, 'warn'>
}): Promise<MarkBondReceivedResult> {
  const { admin, landlordProfileId, bookingId, logger } = args

  const { data: booking, error: loadErr } = await admin
    .from('bookings')
    .select(
      `
      id,
      landlord_id,
      status,
      service_tier_final,
      student_id,
      property_id,
      bond_received_by_landlord_at,
      confirmed_at
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (loadErr) {
    warn(logger, '[mark-bond-received] load booking', loadErr)
    return { ok: false, status: 500, code: 'db_error', message: 'Could not load booking.' }
  }
  if (!booking) {
    return { ok: false, status: 404, code: 'not_found', message: 'Booking not found.' }
  }

  if (booking.landlord_id !== landlordProfileId) {
    return { ok: false, status: 403, code: 'forbidden', message: 'Forbidden.' }
  }

  if (booking.service_tier_final !== 'listing') {
    return {
      ok: false,
      status: 400,
      code: 'wrong_tier',
      message: 'This action applies only to Listing bookings.',
    }
  }

  const st = booking.status as string
  if (st === 'confirmed' || st === 'active') {
    const row: MarkBondReceivedBookingPayload = {
      id: booking.id,
      status: st,
      bond_received_by_landlord_at: booking.bond_received_by_landlord_at as string | null,
      service_tier_final: booking.service_tier_final as string | null,
      confirmed_at: booking.confirmed_at as string | null,
    }
    return { ok: true, idempotent: true, booking: row }
  }

  if (st !== 'bond_pending') {
    return {
      ok: false,
      status: 409,
      code: 'invalid_status',
      message: 'Bond can only be acknowledged while the booking is awaiting bond confirmation.',
    }
  }

  const nowIso = new Date().toISOString()

  const { data: updatedRows, error: upErr } = await admin
    .from('bookings')
    .update({
      bond_received_by_landlord_at: nowIso,
      status: 'confirmed',
    })
    .eq('id', bookingId)
    .eq('status', 'bond_pending')
    .select(BOOKING_MARK_SELECT)

  if (upErr) {
    warn(logger, '[mark-bond-received] booking update', upErr)
    return { ok: false, status: 500, code: 'db_error', message: 'Could not update booking.' }
  }

  const updated = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows

  if (!updated) {
    const { data: again } = await admin
      .from('bookings')
      .select(
        `
        id,
        status,
        bond_received_by_landlord_at,
        service_tier_final,
        confirmed_at
      `,
      )
      .eq('id', bookingId)
      .maybeSingle()

    const againStatus = again?.status as string | undefined
    if (againStatus === 'confirmed' || againStatus === 'active') {
      const row: MarkBondReceivedBookingPayload = {
        id: again!.id,
        status: againStatus,
        bond_received_by_landlord_at: again!.bond_received_by_landlord_at as string | null,
        service_tier_final: again!.service_tier_final as string | null,
        confirmed_at: again!.confirmed_at as string | null,
      }
      return { ok: true, idempotent: true, booking: row }
    }

    return {
      ok: false,
      status: 409,
      code: 'concurrent_update',
      message: 'Booking state changed. Refresh and try again.',
    }
  }

  const { error: evErr } = await admin.from('service_tier_events').insert({
    booking_id: updated.id,
    property_id: updated.property_id,
    landlord_id: updated.landlord_id,
    student_id: updated.student_id,
    event_type: 'bond_received_acknowledged',
    service_tier: 'listing',
    metadata: { bond_received_at: nowIso },
  })

  if (evErr) {
    warn(logger, '[mark-bond-received] service_tier_events insert', evErr)
  }

  if (updated.property_id) {
    try {
      await declineCompetingBookings(admin, null, {
        propertyId: updated.property_id,
        winningBookingId: updated.id,
      })
    } catch (e) {
      warn(logger, '[mark-bond-received] decline competing bookings', e)
    }
  }

  if (updated.service_tier_final === 'listing') {
    try {
      await sendListingBondReceivedEmails(admin, bookingId)
    } catch (e) {
      warn(logger, '[mark-bond-received] listing bond-received emails', e)
    }

    /** If signing was not sent at accept (legacy booking or generator failure), retry now. */
    try {
      const signingAlreadySent = await listingLeaseSigningAlreadyInitiated(admin, bookingId)
      if (!signingAlreadySent) {
        await triggerListingDocumentGeneration({
          admin,
          bookingId,
          deferSigning: false,
          logger: { warn: (msg, err) => warn(logger, msg, err), error: (msg, err) => warn(logger, msg, err) },
        })
      }
    } catch (e) {
      warn(logger, '[mark-bond-received] listing signing trigger', e)
    }
  }

  const row: MarkBondReceivedBookingPayload = {
    id: updated.id,
    status: updated.status as string,
    bond_received_by_landlord_at: updated.bond_received_by_landlord_at as string | null,
    service_tier_final: updated.service_tier_final as string | null,
    confirmed_at: updated.confirmed_at as string | null,
  }

  return { ok: true, idempotent: false, booking: row }
}
