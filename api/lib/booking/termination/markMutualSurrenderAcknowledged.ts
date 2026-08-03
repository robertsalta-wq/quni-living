import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../../src/lib/database.types.js'
import { effectiveDateReached } from './types.js'
import { runFinalizeTerminatedBooking } from './finalizeTerminatedBooking.js'

/**
 * Called when mutual_termination DocuSeal doc becomes fully signed.
 * Sets termination_acknowledged_at; if effective date already reached, finalize immediately.
 */
export async function markMutualSurrenderAcknowledged(args: {
  admin: SupabaseClient<Database>
  bookingId: string
  documentId: string
}): Promise<{ ok: true; finalized: boolean } | { ok: false; reason: string }> {
  const { admin, bookingId, documentId } = args
  const nowIso = new Date().toISOString()

  const { data: booking, error } = await admin
    .from('bookings')
    .select(
      'id, status, termination_type, termination_effective_date, termination_acknowledged_at, landlord_id, student_id, property_id, service_tier_final',
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (error || !booking) {
    return { ok: false, reason: 'booking_not_found' }
  }

  if (booking.status !== 'terminating' || booking.termination_type !== 'mutual_surrender') {
    return { ok: false, reason: 'not_mutual_surrender_terminating' }
  }

  if (!booking.termination_acknowledged_at) {
    const { error: upErr } = await admin
      .from('bookings')
      .update({ termination_acknowledged_at: nowIso })
      .eq('id', bookingId)
      .eq('status', 'terminating')
    if (upErr) {
      console.error('[mark-mutual-surrender-ack] update', upErr)
      return { ok: false, reason: 'update_failed' }
    }

    try {
      const { recordBookingEvent } = await import('../events/recordBookingEvent.js')
      await recordBookingEvent(admin, {
        bookingId,
        landlordId: booking.landlord_id,
        studentId: booking.student_id,
        eventType: 'booking.termination_acknowledged',
        actorType: 'system',
        metadata: {
          document_id: documentId,
          termination_type: 'mutual_surrender',
        },
      })
    } catch (evErr) {
      console.error('[mark-mutual-surrender-ack] event', evErr)
    }
  }

  const eff = booking.termination_effective_date
  if (typeof eff === 'string' && effectiveDateReached(eff)) {
    const fin = await runFinalizeTerminatedBooking({ admin, bookingId })
    return { ok: true, finalized: fin.ok && !fin.skipped }
  }

  return { ok: true, finalized: false }
}
