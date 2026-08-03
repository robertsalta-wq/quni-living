import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../../src/lib/database.types.js'
import { runUnwindListingAgreementCleanup } from '../unwindListingAgreement.js'
import { effectiveDateReached } from './types.js'

export type FinalizeTerminatedResult =
  | { ok: true; skipped: true; reason: string }
  | { ok: true; skipped: false; bookingId: string }
  | { ok: false; retry: true; reason: string }

/**
 * terminating → terminated on/after effective date when mutual surrender is acknowledged
 * (or non-mutual types once those are wired). Runs unwind teardown.
 */
export async function runFinalizeTerminatedBooking(args: {
  admin: SupabaseClient<Database>
  bookingId: string
  now?: Date
}): Promise<FinalizeTerminatedResult> {
  const { admin, bookingId } = args
  const now = args.now ?? new Date()

  const { data: booking, error } = await admin
    .from('bookings')
    .select(
      `
      id, status, landlord_id, student_id, property_id, service_tier_final,
      termination_type, termination_effective_date, termination_acknowledged_at,
      termination_initiated_by, bond_outcome
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (error) {
    console.error('[finalize-terminated] load', error)
    return { ok: false, retry: true, reason: 'db_error' }
  }
  if (!booking) {
    return { ok: true, skipped: true, reason: 'not_found' }
  }
  if (booking.status === 'terminated') {
    return { ok: true, skipped: true, reason: 'already_terminated' }
  }
  if (booking.status !== 'terminating') {
    return { ok: true, skipped: true, reason: 'not_terminating' }
  }

  const eff = booking.termination_effective_date
  if (typeof eff !== 'string' || !effectiveDateReached(eff, now)) {
    return { ok: true, skipped: true, reason: 'effective_date_not_reached' }
  }

  if (booking.termination_type === 'mutual_surrender' && !booking.termination_acknowledged_at) {
    return { ok: true, skipped: true, reason: 'awaiting_acknowledgment' }
  }

  const nowIso = now.toISOString()
  const { data: updated, error: upErr } = await admin
    .from('bookings')
    .update({ status: 'terminated', updated_at: nowIso })
    .eq('id', bookingId)
    .eq('status', 'terminating')
    .select('id')

  if (upErr) {
    console.error('[finalize-terminated] update', upErr)
    return { ok: false, retry: true, reason: 'update_failed' }
  }
  if (!updated?.length) {
    return { ok: true, skipped: true, reason: 'concurrent' }
  }

  await runUnwindListingAgreementCleanup(admin, {
    bookingId,
    propertyId: booking.property_id,
    landlordId: booking.landlord_id,
    studentId: booking.student_id,
    serviceTier: booking.service_tier_final,
    unwindReason: 'terminated',
  })

  try {
    const { recordBookingEvent } = await import('../events/recordBookingEvent.js')
    await recordBookingEvent(admin, {
      bookingId,
      landlordId: booking.landlord_id,
      studentId: booking.student_id,
      eventType: 'booking.agreement_terminated',
      actorType: 'system',
      metadata: {
        termination_type: booking.termination_type,
        termination_effective_date: booking.termination_effective_date,
        termination_initiated_by: booking.termination_initiated_by,
        bond_outcome: booking.bond_outcome,
        service_tier: booking.service_tier_final,
      },
    })
  } catch (evErr) {
    console.error('[finalize-terminated] event', evErr)
  }

  return { ok: true, skipped: false, bookingId }
}

/** Cron helper: finalize all due terminating bookings. */
export async function runFinalizeDueTerminations(
  admin: SupabaseClient<Database>,
  now: Date = new Date(),
): Promise<{ finalized: number; skipped: number; errors: number }> {
  const today = now.toISOString().slice(0, 10)
  const { data: rows, error } = await admin
    .from('bookings')
    .select('id')
    .eq('status', 'terminating')
    .lte('termination_effective_date', today)
    .limit(100)

  if (error) {
    console.error('[finalize-due] list', error)
    return { finalized: 0, skipped: 0, errors: 1 }
  }

  let finalized = 0
  let skipped = 0
  let errors = 0
  for (const row of rows ?? []) {
    const r = await runFinalizeTerminatedBooking({ admin, bookingId: row.id, now })
    if (!r.ok) errors += 1
    else if (r.skipped) skipped += 1
    else finalized += 1
  }
  return { finalized, skipped, errors }
}
