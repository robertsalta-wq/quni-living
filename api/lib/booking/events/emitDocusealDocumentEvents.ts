/**
 * Shared DocuSeal → booking_events shapes (webhook, refresh, admin, historical).
 * One dialect only — callers must not invent alternate metadata keys.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { recordBookingEvent, type RecordBookingEventOptions } from './recordBookingEvent.js'
import type { BookingEventActorType, BookingEventChange } from './types.js'

export type DocusealSignatureParty = 'landlord' | 'student' | 'co_tenant'

export type DocusealEventSource =
  | 'webhook'
  | 'refresh'
  | 'reconcile'
  | 'historical_reconcile'
  | 'send'
  | 'generate'
  | 'void'
  | 'regenerate'
  | 'archive'

export type BookingIdsForDocusealEvent = {
  bookingId: string
  landlordId?: string | null
  studentId?: string | null
}

export type DocusealEventActor = {
  actorType: BookingEventActorType
  actorId?: string | null
  actorLabel?: string | null
}

const PARTY_SIGNED_AT_FIELD: Record<DocusealSignatureParty, string> = {
  landlord: 'landlord_signed_at',
  student: 'student_signed_at',
  co_tenant: 'co_tenant_signed_at',
}

function nonEmptyIso(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t ? t : null
}

function laterIso(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return Date.parse(a) >= Date.parse(b) ? a : b
}

export function maxSignatureOccurredAt(args: {
  landlordSignedAt: string | null
  studentSignedAt: string | null
  coTenantSignedAt: string | null
}): string {
  const max =
    laterIso(args.landlordSignedAt, laterIso(args.studentSignedAt, args.coTenantSignedAt)) ??
    new Date().toISOString()
  return max
}

export type EmitSignatureRecordedArgs = BookingIdsForDocusealEvent &
  DocusealEventActor & {
    documentId: string
    submissionId: string
    party: DocusealSignatureParty
    signedAt: string
    source: DocusealEventSource
    oldSignedAt?: string | null
  }

/** Per-party signature row — same shape for live webhook and reconcile. */
export async function emitDocumentSignatureRecorded(
  admin: SupabaseClient,
  args: EmitSignatureRecordedArgs,
  options: RecordBookingEventOptions = { required: true },
) {
  const field = PARTY_SIGNED_AT_FIELD[args.party]
  const changes: BookingEventChange[] = [
    {
      field,
      old: nonEmptyIso(args.oldSignedAt) ?? null,
      new: args.signedAt,
    },
  ]

  return recordBookingEvent(
    admin,
    {
      bookingId: args.bookingId,
      landlordId: args.landlordId,
      studentId: args.studentId,
      eventType: 'document.signature_recorded',
      occurredAt: args.signedAt,
      actorType: args.actorType,
      actorId: args.actorId,
      actorLabel: args.actorLabel,
      provider: 'docuseal',
      providerRef: args.submissionId,
      documentId: args.documentId,
      changes,
      metadata: {
        party: args.party,
        source: args.source,
        docuseal_submission_id: args.submissionId,
      },
    },
    options,
  )
}

export type EmitFullySignedArgs = BookingIdsForDocusealEvent &
  DocusealEventActor & {
    documentId: string
    submissionId: string
    landlordSignedAt: string | null
    studentSignedAt: string | null
    coTenantSignedAt: string | null
    source: DocusealEventSource
    signedPath?: string | null
  }

export async function emitDocumentFullySigned(
  admin: SupabaseClient,
  args: EmitFullySignedArgs,
  options: RecordBookingEventOptions = { required: true },
) {
  const occurredAt = maxSignatureOccurredAt({
    landlordSignedAt: nonEmptyIso(args.landlordSignedAt),
    studentSignedAt: nonEmptyIso(args.studentSignedAt),
    coTenantSignedAt: nonEmptyIso(args.coTenantSignedAt),
  })

  return recordBookingEvent(
    admin,
    {
      bookingId: args.bookingId,
      landlordId: args.landlordId,
      studentId: args.studentId,
      eventType: 'document.fully_signed',
      occurredAt,
      actorType: args.actorType,
      actorId: args.actorId,
      actorLabel: args.actorLabel,
      provider: 'docuseal',
      providerRef: args.submissionId,
      documentId: args.documentId,
      metadata: {
        source: args.source,
        docuseal_submission_id: args.submissionId,
        ...(args.signedPath ? { links: { signed_pdf: args.signedPath } } : {}),
      },
    },
    options,
  )
}

export type SignatureTimestamps = {
  landlordSignedAt: string | null
  studentSignedAt: string | null
  coTenantSignedAt: string | null
}

/**
 * Emit signature_recorded for parties newly set (or ensure gaps when `ensureMissing`).
 * Then emit fully_signed once when becoming fully signed (or ensure missing fully_signed).
 */
export async function emitDocusealSyncBookingEvents(
  admin: SupabaseClient,
  args: BookingIdsForDocusealEvent &
    DocusealEventActor & {
      documentId: string
      submissionId: string
      before: SignatureTimestamps
      after: SignatureTimestamps
      fullySigned: boolean
      wasFullySigned: boolean
      source: DocusealEventSource
      signedPath?: string | null
      /** When true, also emit if columns already set but matching events are absent. */
      ensureMissing?: boolean
    },
  options: RecordBookingEventOptions = { required: true },
): Promise<{ signaturesEmitted: DocusealSignatureParty[]; fullySignedEmitted: boolean }> {
  const signaturesEmitted: DocusealSignatureParty[] = []
  const parties: DocusealSignatureParty[] = ['landlord', 'student', 'co_tenant']

  let existingParties: Set<string> | null = null
  let hasFullySignedEvent = false

  if (args.ensureMissing) {
    const { data: existing, error } = await admin
      .from('booking_events')
      .select('event_type, metadata')
      .eq('booking_id', args.bookingId)
      .eq('document_id', args.documentId)
      .in('event_type', ['document.signature_recorded', 'document.fully_signed'])

    if (error) {
      if (options.required) throw error
      console.error('[emitDocusealSyncBookingEvents] load existing events', error)
    } else {
      existingParties = new Set()
      for (const row of existing ?? []) {
        if (row.event_type === 'document.fully_signed') {
          hasFullySignedEvent = true
          continue
        }
        const meta =
          row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
            ? (row.metadata as Record<string, unknown>)
            : {}
        if (typeof meta.party === 'string') existingParties.add(meta.party)
      }
    }
  }

  for (const party of parties) {
    const beforeAt =
      party === 'landlord'
        ? nonEmptyIso(args.before.landlordSignedAt)
        : party === 'student'
          ? nonEmptyIso(args.before.studentSignedAt)
          : nonEmptyIso(args.before.coTenantSignedAt)
    const afterAt =
      party === 'landlord'
        ? nonEmptyIso(args.after.landlordSignedAt)
        : party === 'student'
          ? nonEmptyIso(args.after.studentSignedAt)
          : nonEmptyIso(args.after.coTenantSignedAt)

    if (!afterAt) continue

    const newlySet = !beforeAt && Boolean(afterAt)
    const missingEvent = args.ensureMissing && existingParties && !existingParties.has(party)
    if (!newlySet && !missingEvent) continue

    await emitDocumentSignatureRecorded(
      admin,
      {
        bookingId: args.bookingId,
        landlordId: args.landlordId,
        studentId: args.studentId,
        documentId: args.documentId,
        submissionId: args.submissionId,
        party,
        signedAt: afterAt,
        oldSignedAt: beforeAt,
        source: args.source,
        actorType: args.actorType,
        actorId: args.actorId,
        actorLabel: args.actorLabel,
      },
      options,
    )
    signaturesEmitted.push(party)
  }

  let fullySignedEmitted = false
  const transitionToFullySigned = args.fullySigned && !args.wasFullySigned
  const ensureFullySigned = Boolean(args.ensureMissing && args.fullySigned && !hasFullySignedEvent)

  if (transitionToFullySigned || ensureFullySigned) {
    await emitDocumentFullySigned(
      admin,
      {
        bookingId: args.bookingId,
        landlordId: args.landlordId,
        studentId: args.studentId,
        documentId: args.documentId,
        submissionId: args.submissionId,
        landlordSignedAt: args.after.landlordSignedAt,
        studentSignedAt: args.after.studentSignedAt,
        coTenantSignedAt: args.after.coTenantSignedAt,
        source: args.source,
        signedPath: args.signedPath,
        actorType: args.actorType,
        actorId: args.actorId,
        actorLabel: args.actorLabel,
      },
      options,
    )
    fullySignedEmitted = true
  }

  return { signaturesEmitted, fullySignedEmitted }
}

export async function emitDocumentSentForSigning(
  admin: SupabaseClient,
  args: BookingIdsForDocusealEvent &
    DocusealEventActor & {
      documentId: string
      submissionId: string
      source?: DocusealEventSource
    },
  options: RecordBookingEventOptions = {},
) {
  return recordBookingEvent(
    admin,
    {
      bookingId: args.bookingId,
      landlordId: args.landlordId,
      studentId: args.studentId,
      eventType: 'document.sent_for_signing',
      actorType: args.actorType,
      actorId: args.actorId,
      actorLabel: args.actorLabel,
      provider: 'docuseal',
      providerRef: args.submissionId,
      documentId: args.documentId,
      metadata: {
        source: args.source ?? 'send',
        docuseal_submission_id: args.submissionId,
      },
    },
    options,
  )
}

export async function emitDocumentGenerated(
  admin: SupabaseClient,
  args: BookingIdsForDocusealEvent &
    DocusealEventActor & {
      documentId: string
      generator?: string | null
      deferSigning?: boolean
    },
  options: RecordBookingEventOptions = {},
) {
  return recordBookingEvent(
    admin,
    {
      bookingId: args.bookingId,
      landlordId: args.landlordId,
      studentId: args.studentId,
      eventType: 'document.generated',
      actorType: args.actorType,
      actorId: args.actorId,
      actorLabel: args.actorLabel,
      documentId: args.documentId,
      metadata: {
        source: 'generate' satisfies DocusealEventSource,
        ...(args.generator ? { generator: args.generator } : {}),
        ...(args.deferSigning != null ? { defer_signing: args.deferSigning } : {}),
      },
    },
    options,
  )
}

export async function emitDocumentVoided(
  admin: SupabaseClient,
  args: BookingIdsForDocusealEvent &
    DocusealEventActor & {
      documentId?: string | null
      submissionId?: string | null
      reason: string
    },
  options: RecordBookingEventOptions = {},
) {
  return recordBookingEvent(
    admin,
    {
      bookingId: args.bookingId,
      landlordId: args.landlordId,
      studentId: args.studentId,
      eventType: 'document.voided',
      actorType: args.actorType,
      actorId: args.actorId,
      actorLabel: args.actorLabel,
      reason: args.reason,
      provider: args.submissionId ? 'docuseal' : null,
      providerRef: args.submissionId ?? null,
      documentId: args.documentId ?? null,
      metadata: {
        source: 'void' satisfies DocusealEventSource,
        ...(args.submissionId ? { docuseal_submission_id: args.submissionId } : {}),
      },
    },
    options,
  )
}

export async function emitDocumentRegenerated(
  admin: SupabaseClient,
  args: BookingIdsForDocusealEvent &
    DocusealEventActor & {
      documentId: string
      previousSubmissionId?: string | null
      previousStatus?: string | null
    },
  options: RecordBookingEventOptions = {},
) {
  return recordBookingEvent(
    admin,
    {
      bookingId: args.bookingId,
      landlordId: args.landlordId,
      studentId: args.studentId,
      eventType: 'document.regenerated',
      actorType: args.actorType,
      actorId: args.actorId,
      actorLabel: args.actorLabel,
      provider: args.previousSubmissionId ? 'docuseal' : null,
      providerRef: args.previousSubmissionId ?? null,
      documentId: args.documentId,
      metadata: {
        source: 'regenerate' satisfies DocusealEventSource,
        ...(args.previousSubmissionId
          ? { previous_docuseal_submission_id: args.previousSubmissionId }
          : {}),
        ...(args.previousStatus ? { previous_status: args.previousStatus } : {}),
      },
    },
    options,
  )
}

export async function emitDocumentReconciled(
  admin: SupabaseClient,
  args: BookingIdsForDocusealEvent &
    DocusealEventActor & {
      documentId: string
      submissionId: string
      source: Extract<DocusealEventSource, 'reconcile' | 'historical_reconcile'>
      changes?: string[]
      metadataExtra?: Record<string, unknown>
    },
  options: RecordBookingEventOptions = {},
) {
  return recordBookingEvent(
    admin,
    {
      bookingId: args.bookingId,
      landlordId: args.landlordId,
      studentId: args.studentId,
      eventType: 'document.reconciled',
      actorType: args.actorType,
      actorId: args.actorId,
      actorLabel: args.actorLabel,
      provider: 'docuseal',
      providerRef: args.submissionId,
      documentId: args.documentId,
      metadata: {
        source: args.source,
        docuseal_submission_id: args.submissionId,
        ...(args.changes ? { changes: args.changes } : {}),
        ...(args.metadataExtra ?? {}),
      },
    },
    options,
  )
}

export async function emitDocumentArchiveFailed(
  admin: SupabaseClient,
  args: BookingIdsForDocusealEvent &
    DocusealEventActor & {
      submissionId: string
      error: string
      httpStatus?: number
      unwindReason?: string
    },
  options: RecordBookingEventOptions = {},
) {
  return recordBookingEvent(
    admin,
    {
      bookingId: args.bookingId,
      landlordId: args.landlordId,
      studentId: args.studentId,
      eventType: 'document.archive_failed',
      actorType: args.actorType,
      actorId: args.actorId,
      actorLabel: args.actorLabel,
      provider: 'docuseal',
      providerRef: args.submissionId,
      reason: args.error,
      metadata: {
        source: 'archive' satisfies DocusealEventSource,
        docuseal_submission_id: args.submissionId,
        ...(args.unwindReason ? { unwind_reason: args.unwindReason } : {}),
        ...(args.httpStatus != null ? { http_status: args.httpStatus } : {}),
      },
    },
    options,
  )
}

export async function emitSignatureOnTerminalBooking(
  admin: SupabaseClient,
  args: BookingIdsForDocusealEvent & {
    documentId: string
    submissionId: string
    bookingStatus: string
  },
  options: RecordBookingEventOptions = {},
) {
  return recordBookingEvent(
    admin,
    {
      bookingId: args.bookingId,
      landlordId: args.landlordId,
      studentId: args.studentId,
      eventType: 'signature.on_terminal_booking',
      actorType: 'webhook',
      provider: 'docuseal',
      providerRef: args.submissionId,
      documentId: args.documentId,
      metadata: {
        source: 'webhook' satisfies DocusealEventSource,
        docuseal_submission_id: args.submissionId,
        tenancy_document_id: args.documentId,
        booking_status: args.bookingStatus,
      },
    },
    options,
  )
}

export async function loadBookingIdsForTenancy(
  admin: SupabaseClient,
  tenancyId: string,
): Promise<BookingIdsForDocusealEvent | null> {
  const { data: tenancy, error: tErr } = await admin
    .from('tenancies')
    .select('booking_id')
    .eq('id', tenancyId)
    .maybeSingle()
  if (tErr) throw tErr
  const bookingId = typeof tenancy?.booking_id === 'string' ? tenancy.booking_id.trim() : ''
  if (!bookingId) return null

  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, landlord_id, student_id')
    .eq('id', bookingId)
    .maybeSingle()
  if (bErr) throw bErr
  if (!booking?.id) return null

  return {
    bookingId: booking.id,
    landlordId: booking.landlord_id,
    studentId: booking.student_id,
  }
}
