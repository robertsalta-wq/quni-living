import type { SupabaseClient } from '@supabase/supabase-js'

import { sendListingBondReceivedEmails } from './listingTransactionalEmails.js'
import { triggerListingDocumentGeneration } from './triggerListingDocumentGeneration.js'
import { declineCompetingBookings } from './declineCompetingBookings.js'
import {
  assertStudentLegalNameForSigningByBookingId,
  TenantLegalNameNotReadyError,
} from './assertStudentLegalNameForSigning.js'
import { maybeAdvanceListingBookingToActive } from './maybeAdvanceListingBookingToActive.js'
import { generateAndPersistListingBondReceipt } from '../../documents/listingBondReceipt.js'

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
 * Soft-fail: generate+persist bond_receipt if missing; optionally email when newly created (repair).
 * Never throws to the caller.
 */
async function softEnsureListingBondReceipt(args: {
  admin: SupabaseClient
  bookingId: string
  logger?: Pick<Console, 'warn'>
  /** When true, send bond-received emails with PDF if we just created the receipt (repair path). */
  emailIfCreated?: boolean
}): Promise<{ pdfAttachment: { filename: string; content: string } | null; created: boolean }> {
  const { admin, bookingId, logger, emailIfCreated } = args
  try {
    const gen = await generateAndPersistListingBondReceipt({ admin, bookingId, logger })
    if (gen.status === 'created') {
      const pdfAttachment = {
        filename: 'bond_receipt.pdf',
        content: gen.pdfBase64,
      }
      if (emailIfCreated) {
        try {
          await sendListingBondReceivedEmails(admin, bookingId, { pdfAttachment })
        } catch (e) {
          warn(logger, '[mark-bond-received] listing bond-received emails (repair)', e)
        }
      }
      return { pdfAttachment, created: true }
    }
    return { pdfAttachment: null, created: false }
  } catch (e) {
    warn(logger, '[mark-bond-received] listing bond receipt', e)
    return { pdfAttachment: null, created: false }
  }
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
    // Repair-friendly: if receipt never persisted, soft-generate (and email if newly created).
    await softEnsureListingBondReceipt({ admin, bookingId, logger, emailIfCreated: true })
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
      await softEnsureListingBondReceipt({ admin, bookingId, logger, emailIfCreated: true })
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

  try {
    const { recordBookingEvent } = await import('./events/recordBookingEvent.js')
    const ev = await recordBookingEvent(admin, {
      bookingId: updated.id,
      landlordId: updated.landlord_id,
      studentId: updated.student_id,
      eventType: 'bond.received_acknowledged',
      actorType: 'landlord',
      metadata: { bond_received_at: nowIso, service_tier: 'listing' },
    })
    if (!ev.ok) {
      warn(logger, '[mark-bond-received] bond.received_acknowledged event', ev.message)
    }
  } catch (evErr) {
    warn(logger, '[mark-bond-received] bond.received_acknowledged event', evErr)
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
    let pdfAttachment: { filename: string; content: string } | null = null
    try {
      const ensured = await softEnsureListingBondReceipt({ admin, bookingId, logger })
      pdfAttachment = ensured.pdfAttachment
    } catch (e) {
      warn(logger, '[mark-bond-received] listing bond receipt', e)
    }

    try {
      await sendListingBondReceivedEmails(admin, bookingId, {
        pdfAttachment,
      })
    } catch (e) {
      warn(logger, '[mark-bond-received] listing bond-received emails', e)
    }

    /** If signing was not sent at accept (legacy booking or generator failure), retry now. */
    try {
      const signingAlreadySent = await listingLeaseSigningAlreadyInitiated(admin, bookingId)
      if (!signingAlreadySent) {
        await assertStudentLegalNameForSigningByBookingId(admin, bookingId)
        await triggerListingDocumentGeneration({
          admin,
          bookingId,
          deferSigning: false,
          logger: { warn: (msg, err) => warn(logger, msg, err), error: (msg, err) => warn(logger, msg, err) },
        })
      }
    } catch (e) {
      if (e instanceof TenantLegalNameNotReadyError) {
        warn(logger, '[mark-bond-received] tenant legal name gate', e)
      } else {
        warn(logger, '[mark-bond-received] listing signing trigger', e)
      }
    }

    // Sign-then-bond (normal Listing order): lease may already be fully signed.
    try {
      const adv = await maybeAdvanceListingBookingToActive(admin, bookingId, { logger })
      if (adv.advanced) {
        return {
          ok: true,
          idempotent: false,
          booking: {
            id: updated.id,
            status: 'active',
            bond_received_by_landlord_at: updated.bond_received_by_landlord_at as string | null,
            service_tier_final: updated.service_tier_final as string | null,
            confirmed_at: updated.confirmed_at as string | null,
          },
        }
      }
    } catch (e) {
      warn(logger, '[mark-bond-received] maybeAdvanceListingBookingToActive', e)
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
