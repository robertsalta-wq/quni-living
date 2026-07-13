/**
 * One-off / admin historical DocuSeal signature reconcile.
 * Signatures only — does not reinstate booking status.
 * Emits the same document.signature_recorded / document.fully_signed shapes as the live webhook.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { emitDocumentReconciled } from '../booking/events/emitDocusealDocumentEvents.js'
import {
  fetchDocusealSubmission,
  syncFullySignedDocusealSubmission,
  type TenancyDocumentSyncRow,
} from './reconcileFromDocuseal.js'

export const HISTORICAL_DOCUSEAL_SUBMISSION_IDS = ['129', '133', '135'] as const

export type HistoricalReconcileResult = {
  submissionId: string
  documentId: string | null
  bookingId: string | null
  ok: boolean
  skipped?: boolean
  message: string
  nextLandlordAt?: string | null
  nextStudentAt?: string | null
  nextCoTenantAt?: string | null
  fullySigned?: boolean
}

const LEASE_DOC_TYPES = ['lease', 'residential_tenancy'] as const

export async function findTenancyDocumentBySubmissionId(
  admin: SupabaseClient,
  submissionId: string,
): Promise<{
  doc: TenancyDocumentSyncRow
  bookingId: string | null
  landlordId: string | null
  studentId: string | null
} | null> {
  const { data: doc, error } = await admin
    .from('tenancy_documents')
    .select(
      'id, tenancy_id, docuseal_submission_id, metadata, status, landlord_signed_at, student_signed_at, co_tenant_signed_at, file_path',
    )
    .eq('docuseal_submission_id', submissionId)
    .maybeSingle()

  if (error) throw error
  if (!doc?.id || !doc.tenancy_id) return null

  const { data: tenancy, error: tErr } = await admin
    .from('tenancies')
    .select('booking_id')
    .eq('id', doc.tenancy_id)
    .maybeSingle()
  if (tErr) throw tErr

  const bookingId = typeof tenancy?.booking_id === 'string' ? tenancy.booking_id : null
  let landlordId: string | null = null
  let studentId: string | null = null
  if (bookingId) {
    const { data: booking, error: bErr } = await admin
      .from('bookings')
      .select('landlord_id, student_id')
      .eq('id', bookingId)
      .maybeSingle()
    if (bErr) throw bErr
    landlordId = booking?.landlord_id ?? null
    studentId = booking?.student_id ?? null
  }

  return {
    doc: doc as TenancyDocumentSyncRow,
    bookingId,
    landlordId,
    studentId,
  }
}

/** Peers: lease docs with a submission id and all local *_signed_at null. */
export async function discoverUnsignedLeaseSubmissionIds(
  admin: SupabaseClient,
  limit = 50,
): Promise<string[]> {
  const { data, error } = await admin
    .from('tenancy_documents')
    .select('docuseal_submission_id')
    .not('docuseal_submission_id', 'is', null)
    .in('document_type', [...LEASE_DOC_TYPES])
    .is('landlord_signed_at', null)
    .is('student_signed_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  const ids = new Set<string>()
  for (const row of data ?? []) {
    const id = typeof row.docuseal_submission_id === 'string' ? row.docuseal_submission_id.trim() : ''
    if (id) ids.add(id)
  }
  return [...ids]
}

export async function reconcileHistoricalDocusealSignatures(args: {
  admin: SupabaseClient
  submissionIds: string[]
  dryRun?: boolean
  actorId?: string | null
  actorLabel?: string | null
}): Promise<HistoricalReconcileResult[]> {
  const { admin, dryRun = false, actorId = null, actorLabel = null } = args
  const results: HistoricalReconcileResult[] = []

  for (const rawId of args.submissionIds) {
    const submissionId = String(rawId || '').trim()
    if (!submissionId) continue

    try {
      const found = await findTenancyDocumentBySubmissionId(admin, submissionId)
      if (!found) {
        results.push({
          submissionId,
          documentId: null,
          bookingId: null,
          ok: false,
          skipped: true,
          message: 'No tenancy_document for submission id',
        })
        continue
      }

      const { doc, bookingId, landlordId, studentId } = found
      const submissionPayload = await fetchDocusealSubmission(submissionId)

      if (dryRun) {
        results.push({
          submissionId,
          documentId: doc.id,
          bookingId,
          ok: true,
          skipped: true,
          message: 'dry_run',
        })
        continue
      }

      const sync = await syncFullySignedDocusealSubmission({
        admin,
        docRow: doc,
        submissionId,
        submissionPayload,
        metadataExtra: {
          historical_reconcile: {
            reason: 'pre_webhook_fix_signatures',
            reconciled_at: new Date().toISOString(),
            docuseal_submission_id: submissionId,
          },
        },
        eventOptions: {
          source: 'historical_reconcile',
          actorType: actorId ? 'admin' : 'system',
          actorId,
          actorLabel,
          ensureMissing: true,
          required: true,
        },
      })

      if (bookingId) {
        await emitDocumentReconciled(admin, {
          bookingId,
          landlordId,
          studentId,
          documentId: doc.id,
          submissionId,
          source: 'historical_reconcile',
          actorType: actorId ? 'admin' : 'system',
          actorId,
          actorLabel,
          changes: [
            `landlord_signed_at → ${sync.nextLandlordAt ?? 'null'}`,
            `student_signed_at → ${sync.nextStudentAt ?? 'null'}`,
            `co_tenant_signed_at → ${sync.nextCoTenantAt ?? 'null'}`,
            sync.fullySigned ? 'document fully signed on DocuSeal' : 'partial signatures only',
          ],
          metadataExtra: {
            fully_signed: sync.fullySigned,
            signed_path: sync.signedPath,
          },
        })
      }

      results.push({
        submissionId,
        documentId: doc.id,
        bookingId,
        ok: true,
        message: sync.fullySigned ? 'synced_fully_signed' : 'synced_partial',
        nextLandlordAt: sync.nextLandlordAt,
        nextStudentAt: sync.nextStudentAt,
        nextCoTenantAt: sync.nextCoTenantAt,
        fullySigned: sync.fullySigned,
      })
    } catch (e) {
      results.push({
        submissionId,
        documentId: null,
        bookingId: null,
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return results
}
