import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '../../../../src/lib/database.types.js'
import { stripDocusealEmbedSrcFromMetadata } from '../listingAgreementMetadata.js'
import { tryArchiveDocusealSubmissionBestEffort } from '../unwindListingAgreement.js'
import { listingLeaseDocLooksFullySigned } from '../maybeAdvanceListingBookingToActive.js'

export type WithdrawMutualSurrenderResult =
  | {
      ok: true
      bookingId: string
      restoredStatus: 'confirmed' | 'active'
    }
  | { ok: false; status: number; code: string; message: string }

type RestoreStatus = 'confirmed' | 'active'

async function resolveRestoreStatus(
  admin: SupabaseClient<Database>,
  booking: {
    id: string
    bond_received_by_landlord_at: string | null
  },
): Promise<RestoreStatus> {
  const { data: initiated } = await admin
    .from('booking_events')
    .select('metadata')
    .eq('booking_id', booking.id)
    .eq('event_type', 'booking.termination_initiated')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const meta =
    initiated?.metadata && typeof initiated.metadata === 'object' && !Array.isArray(initiated.metadata)
      ? (initiated.metadata as Record<string, unknown>)
      : null
  const stored = meta?.status_before_termination
  if (stored === 'confirmed' || stored === 'active') return stored

  const { data: statusEv } = await admin
    .from('booking_events')
    .select('changes')
    .eq('booking_id', booking.id)
    .eq('event_type', 'booking.status_changed')
    .order('created_at', { ascending: false })
    .limit(20)

  for (const row of statusEv ?? []) {
    const changes = Array.isArray(row.changes) ? row.changes : []
    for (const c of changes) {
      if (!c || typeof c !== 'object') continue
      const ch = c as { field?: string; old?: unknown; new?: unknown }
      if (ch.field === 'status' && ch.new === 'terminating') {
        if (ch.old === 'confirmed' || ch.old === 'active') return ch.old
      }
    }
  }

  // Fallback: same gates as listing confirmed→active (bond + signed lease).
  if (!booking.bond_received_by_landlord_at) return 'confirmed'

  const { data: tenancy } = await admin
    .from('tenancies')
    .select('id')
    .eq('booking_id', booking.id)
    .maybeSingle()
  if (!tenancy?.id) return 'confirmed'

  const { data: docs } = await admin
    .from('tenancy_documents')
    .select('status, landlord_signed_at, student_signed_at, co_tenant_signed_at')
    .eq('tenancy_id', tenancy.id)
    .in('document_type', ['residential_tenancy', 'lease'])
    .order('created_at', { ascending: false })
    .limit(1)

  const doc = docs?.[0]
  if (
    doc &&
    listingLeaseDocLooksFullySigned(
      {
        status: doc.status,
        landlord_signed_at: doc.landlord_signed_at,
        student_signed_at: doc.student_signed_at,
        co_tenant_signed_at: doc.co_tenant_signed_at,
      },
      false,
    )
  ) {
    return 'active'
  }
  return 'confirmed'
}

async function archiveMutualTerminationDoc(
  admin: SupabaseClient<Database>,
  args: {
    bookingId: string
    landlordId: string | null
    studentId: string | null
    propertyId: string | null
    serviceTier: string | null
  },
): Promise<void> {
  const { data: tenancy } = await admin
    .from('tenancies')
    .select('id')
    .eq('booking_id', args.bookingId)
    .maybeSingle()
  if (!tenancy?.id) return

  const { data: docs } = await admin
    .from('tenancy_documents')
    .select('id, status, metadata, docuseal_submission_id')
    .eq('tenancy_id', tenancy.id)
    .eq('document_type', 'mutual_termination')

  for (const doc of docs ?? []) {
    if (doc.status === 'archived') continue
    const submissionId =
      typeof doc.docuseal_submission_id === 'string' ? doc.docuseal_submission_id.trim() : ''
    if (submissionId) {
      await tryArchiveDocusealSubmissionBestEffort(admin, submissionId, {
        bookingId: args.bookingId,
        propertyId: args.propertyId,
        landlordId: args.landlordId,
        studentId: args.studentId,
        serviceTier: args.serviceTier,
        unwindReason: 'regenerate',
      })
    }

    const nextMeta = stripDocusealEmbedSrcFromMetadata(doc.metadata)
    const { error: upErr } = await admin
      .from('tenancy_documents')
      .update({
        status: 'archived',
        docuseal_submission_id: null,
        landlord_signed_at: null,
        student_signed_at: null,
        metadata: {
          ...(nextMeta && typeof nextMeta === 'object' && !Array.isArray(nextMeta) ? nextMeta : {}),
          withdrawn_at: new Date().toISOString(),
          withdrawn_reason: 'termination_withdrawn',
        } as Json,
      })
      .eq('id', doc.id)

    if (upErr) {
      console.error('[withdraw-mutual-surrender] archive doc', doc.id, upErr)
      continue
    }

    try {
      const { emitDocumentVoided } = await import('../events/emitDocusealDocumentEvents.js')
      await emitDocumentVoided(admin, {
        bookingId: args.bookingId,
        landlordId: args.landlordId,
        studentId: args.studentId,
        documentId: doc.id,
        submissionId: submissionId || null,
        reason: 'withdrawn',
        actorType: 'system',
      })
    } catch (evErr) {
      console.error('[withdraw-mutual-surrender] document.voided', doc.id, evErr)
    }
  }
}

/**
 * Landlord withdraws a pending mutual surrender while booking is still `terminating`
 * (before finalize/unwind). Restores prior live status; does not end tenancy or void the lease.
 */
export async function runWithdrawMutualSurrender(args: {
  admin: SupabaseClient<Database>
  landlordProfileId: string
  bookingId: string
  reasonNote?: string | null
}): Promise<WithdrawMutualSurrenderResult> {
  const { admin, landlordProfileId, bookingId } = args
  const reasonTrim =
    typeof args.reasonNote === 'string' ? args.reasonNote.trim().slice(0, 2000) : ''

  const { data: booking, error: loadErr } = await admin
    .from('bookings')
    .select(
      `
      id, landlord_id, student_id, property_id, status, service_tier_final,
      termination_type, termination_effective_date, termination_acknowledged_at,
      bond_received_by_landlord_at
    `,
    )
    .eq('id', bookingId)
    .maybeSingle()

  if (loadErr) {
    console.error('[withdraw-mutual-surrender] load', loadErr)
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
      message: 'Withdraw mutual surrender is Listing-tier only.',
    }
  }
  if (booking.status === 'terminated') {
    return {
      ok: false,
      status: 409,
      code: 'already_terminated',
      message: 'This agreement is already terminated and cannot be withdrawn.',
    }
  }
  if (booking.status !== 'terminating' || booking.termination_type !== 'mutual_surrender') {
    return {
      ok: false,
      status: 400,
      code: 'not_terminating',
      message: 'Only a pending mutual surrender (terminating) can be withdrawn.',
    }
  }

  const restoredStatus = await resolveRestoreStatus(admin, {
    id: booking.id,
    bond_received_by_landlord_at: booking.bond_received_by_landlord_at,
  })

  await archiveMutualTerminationDoc(admin, {
    bookingId,
    landlordId: booking.landlord_id,
    studentId: booking.student_id,
    propertyId: booking.property_id,
    serviceTier: booking.service_tier_final,
  })

  const { data: updated, error: upErr } = await admin
    .from('bookings')
    .update({
      status: restoredStatus,
      termination_type: null,
      termination_effective_date: null,
      termination_reason_note: null,
      termination_initiated_by: null,
      termination_initiated_at: null,
      termination_acknowledged_at: null,
      bond_outcome: null,
      bond_outcome_note: null,
    })
    .eq('id', bookingId)
    .eq('status', 'terminating')
    .select('id, status')

  if (upErr) {
    console.error('[withdraw-mutual-surrender] update', upErr)
    return { ok: false, status: 500, code: 'db_error', message: 'Could not withdraw termination.' }
  }
  if (!updated?.length) {
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
      eventType: 'booking.termination_withdrawn',
      actorType: 'landlord',
      reason: reasonTrim || null,
      metadata: {
        termination_type: 'mutual_surrender',
        restored_status: restoredStatus,
        had_acknowledgment: Boolean(booking.termination_acknowledged_at),
        previous_effective_date: booking.termination_effective_date,
        service_tier: 'listing',
      },
    })
  } catch (evErr) {
    console.error('[withdraw-mutual-surrender] event', evErr)
  }

  return { ok: true, bookingId, restoredStatus }
}
