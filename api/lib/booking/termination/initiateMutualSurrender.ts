import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../../src/lib/database.types.js'
import { generateAndSendMutualTerminationDoc } from './generateMutualTerminationDoc.js'
import {
  isBondOutcome,
  parseIsoDateOnly,
  type BondOutcome,
  type TerminationInitiator,
} from './types.js'

export type InitiateMutualSurrenderResult =
  | {
      ok: true
      bookingId: string
      status: 'terminating'
      documentId: string | null
      submissionId: string | null
      landlordSigningUrl: string | null
      idempotent: boolean
    }
  | { ok: false; status: number; code: string; message: string }

/**
 * Landlord (Listing) starts mutual surrender: booking → terminating, generate DocuSeal ack.
 * Room stays reserved until effective date + finalize cron.
 */
export async function runInitiateMutualSurrender(args: {
  admin: SupabaseClient<Database>
  landlordProfileId: string
  bookingId: string
  terminationEffectiveDate: string
  reasonNote?: string | null
  bondOutcome?: BondOutcome | null
  bondOutcomeNote?: string | null
  newPremisesLine?: string | null
  continueInSamePremises?: boolean
  initiatedBy?: TerminationInitiator
}): Promise<InitiateMutualSurrenderResult> {
  const {
    admin,
    landlordProfileId,
    bookingId,
    initiatedBy = 'landlord',
  } = args

  const effectiveDate = parseIsoDateOnly(args.terminationEffectiveDate)
  if (!effectiveDate) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_effective_date',
      message: 'terminationEffectiveDate must be YYYY-MM-DD.',
    }
  }

  const bondOutcome: BondOutcome =
    args.bondOutcome && isBondOutcome(args.bondOutcome) ? args.bondOutcome : 'pending'

  const { data: booking, error: loadErr } = await admin
    .from('bookings')
    .select(
      'id, landlord_id, student_id, property_id, status, service_tier_final, termination_type, termination_effective_date, termination_acknowledged_at',
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (loadErr) {
    console.error('[initiate-mutual-surrender] load', loadErr)
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
      message: 'Mutual surrender terminate is Listing-tier only in v1.',
    }
  }

  if (booking.status === 'terminated') {
    return {
      ok: false,
      status: 409,
      code: 'already_terminated',
      message: 'This agreement is already terminated.',
    }
  }

  const alreadyTerminating =
    booking.status === 'terminating' && booking.termination_type === 'mutual_surrender'

  if (
    !alreadyTerminating &&
    booking.status !== 'confirmed' &&
    booking.status !== 'active'
  ) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_status',
      message: 'Only confirmed or active agreements can be terminated this way.',
    }
  }

  const nowIso = new Date().toISOString()
  const reasonTrim =
    typeof args.reasonNote === 'string' ? args.reasonNote.trim().slice(0, 2000) : ''

  if (!alreadyTerminating && reasonTrim.length < 3) {
    return {
      ok: false,
      status: 400,
      code: 'reason_required',
      message: 'A reason for ending the agreement is required.',
    }
  }

  // Patch termination fields first (keep confirmed/active until DocuSeal succeeds), then flip status.
  if (!alreadyTerminating) {
    const { error: patchErr } = await admin
      .from('bookings')
      .update({
        termination_type: 'mutual_surrender',
        termination_effective_date: effectiveDate,
        termination_reason_note: reasonTrim || null,
        termination_initiated_by: initiatedBy,
        termination_initiated_at: nowIso,
        bond_outcome: bondOutcome,
        bond_outcome_note:
          typeof args.bondOutcomeNote === 'string'
            ? args.bondOutcomeNote.trim().slice(0, 2000)
            : null,
      })
      .eq('id', bookingId)
      .in('status', ['confirmed', 'active'])

    if (patchErr) {
      console.error('[initiate-mutual-surrender] patch fields', patchErr)
      return { ok: false, status: 500, code: 'db_error', message: 'Could not update booking.' }
    }
  }

  const gen = await generateAndSendMutualTerminationDoc({
    admin,
    bookingId,
    terminationEffectiveDate: effectiveDate,
    bondOutcome,
    bondOutcomeNote: args.bondOutcomeNote,
    newPremisesLine: args.newPremisesLine,
    continueInSamePremises: args.continueInSamePremises ?? true,
  })

  if (!gen.ok) {
    console.error('[initiate-mutual-surrender] generate failed', gen)
    return { ok: false, status: gen.status, code: gen.code, message: gen.message }
  }

  if (!alreadyTerminating) {
    const { data: updatedRows, error: upErr } = await admin
      .from('bookings')
      .update({ status: 'terminating' })
      .eq('id', bookingId)
      .in('status', ['confirmed', 'active'])
      .select('id, status')

    if (upErr) {
      console.error('[initiate-mutual-surrender] status update', upErr)
      return { ok: false, status: 500, code: 'db_error', message: 'Could not set terminating status.' }
    }
    if (!updatedRows?.length) {
      return {
        ok: false,
        status: 409,
        code: 'concurrent_update',
        message: 'Booking state changed. Refresh and try again.',
      }
    }

    try {
      const { recordBookingEvent } = await import('../events/recordBookingEvent.js')
      await recordBookingEvent(admin, {
        bookingId,
        landlordId: booking.landlord_id,
        studentId: booking.student_id,
        eventType: 'booking.termination_initiated',
        actorType: initiatedBy === 'admin' ? 'admin' : 'landlord',
        reason: reasonTrim || null,
        metadata: {
          termination_type: 'mutual_surrender',
          termination_effective_date: effectiveDate,
          bond_outcome: bondOutcome,
          service_tier: 'listing',
          document_id: gen.documentId,
          // Used by withdraw to restore confirmed vs active without a schema column.
          status_before_termination: booking.status,
        },
      })
    } catch (evErr) {
      console.error('[initiate-mutual-surrender] event', evErr)
    }
  }

  return {
    ok: true,
    bookingId,
    status: 'terminating',
    documentId: gen.documentId,
    submissionId: gen.submissionId,
    landlordSigningUrl: gen.landlordSigningUrl ?? null,
    idempotent: alreadyTerminating,
  }
}
