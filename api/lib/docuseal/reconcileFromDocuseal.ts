/**
 * Shared DocuSeal completion sync (webhook + admin reconcile + self-serve reinstatement).
 * reinstateBookingAfterDocusealReconcile may be called from admin or party-facing routes;
 * keep admin HTTP endpoints admin-gated separately.
 */
// @ts-nocheck - Vercel isolated API TS pass.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Json } from '../../../src/lib/database.types.js'
import { fetchCoTenantSignerForTenancy } from '../booking/coTenantSigning.js'
import {
  emitDocusealSyncBookingEvents,
  loadBookingIdsForTenancy,
  type DocusealEventActor,
  type DocusealEventSource,
} from '../booking/events/emitDocusealDocumentEvents.js'
import { setListingAgreementStatus } from '../booking/listingAgreementStatus.js'
import { getDocusealApiBase, getDocusealAuthHeaders } from '../docusealClient.js'
import {
  downloadSignedResidentialTenancyPackagePartsFromDocuseal,
  downloadSignedSubmissionPdfFromDocuseal,
  extractCompletedAt,
} from '../docuseal.js'

export const LISTING_BOND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export type TenancyDocumentSyncRow = {
  id: string
  tenancy_id: string | null
  docuseal_submission_id: string | null
  metadata: Json | null
  status: string
  landlord_signed_at: string | null
  student_signed_at: string | null
  co_tenant_signed_at: string | null
  file_path: string | null
}

export type BookingReinstateRow = {
  id: string
  status: string
  bond_received_by_landlord_at: string | null
  service_tier_final: string | null
  listing_agreement_status: string | null
  property_id: string | null
  landlord_id: string | null
  student_id: string | null
  expired_at: string | null
}

export type TenancyReinstateRow = {
  id: string
  status: string
}

export type SyncFullySignedResult = {
  fullySigned: boolean
  signedPath: string | null
  signedUrl: string | null
  isResidentialTenancyPackage: boolean
  isQldResidentialPackage: boolean
  isVicResidentialPackage: boolean
  nextLandlordAt: string | null
  nextStudentAt: string | null
  nextCoTenantAt: string | null
}

export type SubmitterStatusSummary = {
  name: string | null
  role: string | null
  status: string | null
  opened_at: string | null
  completed_at: string | null
}

function parseDocMetadata(row: TenancyDocumentSyncRow) {
  const rowMeta =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {}
  const signingPkgEarly = rowMeta.signing_package
  const isResidentialTenancyPackage =
    signingPkgEarly === 'residential_tenancy' ||
    signingPkgEarly === 'residential_tenancy_qld' ||
    signingPkgEarly === 'residential_tenancy_vic'
  const isQldResidentialPackage = signingPkgEarly === 'residential_tenancy_qld'
  const isVicResidentialPackage = signingPkgEarly === 'residential_tenancy_vic'
  return {
    rowMeta,
    isResidentialTenancyPackage,
    isQldResidentialPackage,
    isVicResidentialPackage,
  }
}

/** Webhook event_type fallback for full submission completion only — never form.completed. */
export function extractSubmissionCompletedAtFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const o = payload as Record<string, unknown>
  const evt = typeof o.event_type === 'string' ? o.event_type.toLowerCase() : ''
  if (evt !== 'submission.completed') return null
  const data = o.data
  const root = data && typeof data === 'object' ? (data as Record<string, unknown>) : o
  const completedAt = root.completed_at
  if (typeof completedAt === 'string' && completedAt.trim()) return completedAt
  return new Date().toISOString()
}

export function summarizeSubmitters(payload: unknown): SubmitterStatusSummary[] {
  if (!payload || typeof payload !== 'object') return []
  const o = payload as Record<string, unknown>
  const data = o.data
  const root = data && typeof data === 'object' ? (data as Record<string, unknown>) : o
  const submitters = root.submitters
  if (!Array.isArray(submitters)) return []
  return submitters.map((s) => {
    if (!s || typeof s !== 'object') {
      return { name: null, role: null, status: null, opened_at: null, completed_at: null }
    }
    const row = s as Record<string, unknown>
    return {
      name: typeof row.name === 'string' ? row.name : null,
      role: typeof row.role === 'string' ? row.role : null,
      status: typeof row.status === 'string' ? row.status : null,
      opened_at: typeof row.opened_at === 'string' ? row.opened_at : null,
      completed_at: typeof row.completed_at === 'string' ? row.completed_at : null,
    }
  })
}

export function submissionStatusFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const o = payload as Record<string, unknown>
  const data = o.data
  const root = data && typeof data === 'object' ? (data as Record<string, unknown>) : o
  const status = root.status
  return typeof status === 'string' ? status : null
}

export async function fetchDocusealSubmission(submissionId: string): Promise<unknown> {
  const base = getDocusealApiBase()
  if (!base) throw new Error('DocuSeal is not configured')
  const url = `${base}/api/submissions/${encodeURIComponent(submissionId)}`
  const res = await fetch(url, { headers: getDocusealAuthHeaders() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DocuSeal GET ${url}: ${res.status} ${text}`)
  }
  return res.json()
}

export function listingBondWindowExpiresAt(fromMs = Date.now()): string {
  return new Date(fromMs + LISTING_BOND_WINDOW_MS).toISOString()
}

export function targetBookingStatusAfterReinstate(
  bondReceivedAt: string | null | undefined,
): 'active' | 'bond_pending' {
  const bond =
    typeof bondReceivedAt === 'string' && bondReceivedAt.trim() ? bondReceivedAt.trim() : null
  return bond ? 'active' : 'bond_pending'
}

export async function isCoTenantRequiredForTenancy(
  admin: SupabaseClient,
  tenancyId: string,
  isResidentialTenancyPackage: boolean,
): Promise<boolean> {
  return (
    isResidentialTenancyPackage && Boolean(await fetchCoTenantSignerForTenancy(admin, tenancyId))
  )
}

/**
 * Live signing statuses may move to sent_for_signing on partial sync.
 * Terminal / void document statuses must never be resurrected to sent_for_signing
 * (historical partial reconcile of archived leases — e.g. withdrawn bookings).
 */
const LIVE_PARTIAL_DOC_STATUSES = new Set(['draft', 'sent_for_signing'])

export function nextTenancyDocumentStatusAfterSync(args: {
  previousStatus: string
  fullySigned: boolean
}): string {
  const previous = (args.previousStatus || '').trim() || 'sent_for_signing'
  if (args.fullySigned) return 'signed'
  if (previous === 'signed') return 'signed'
  if (LIVE_PARTIAL_DOC_STATUSES.has(previous)) return 'sent_for_signing'
  // archived / voided / unknown terminal states: preserve — never archived → sent_for_signing
  return previous
}

export function computeSignatureTimestamps(args: {
  docRow: TenancyDocumentSyncRow
  submissionPayload: unknown
  coTenantRequired: boolean
}): {
  nextLandlordAt: string | null
  nextStudentAt: string | null
  nextCoTenantAt: string | null
  fullySigned: boolean
  nextStatus: string
} {
  const { docRow, submissionPayload, coTenantRequired } = args

  const existingLandlordAt =
    typeof docRow.landlord_signed_at === 'string' && docRow.landlord_signed_at.trim()
      ? docRow.landlord_signed_at
      : null
  const existingStudentAt =
    typeof docRow.student_signed_at === 'string' && docRow.student_signed_at.trim()
      ? docRow.student_signed_at
      : null
  const existingCoTenantAt =
    typeof docRow.co_tenant_signed_at === 'string' && docRow.co_tenant_signed_at.trim()
      ? docRow.co_tenant_signed_at
      : null

  const incomingLandlordAt = extractCompletedAt(submissionPayload, 'landlord')
  const incomingStudentAt = extractCompletedAt(submissionPayload, 'tenant')
  const incomingCoTenantAt = extractCompletedAt(submissionPayload, 'co_tenant')
  const submissionCompletedAt = extractSubmissionCompletedAtFromPayload(submissionPayload)

  const nextLandlordAt = existingLandlordAt ?? incomingLandlordAt ?? submissionCompletedAt
  const nextStudentAt = existingStudentAt ?? incomingStudentAt ?? submissionCompletedAt
  const nextCoTenantAt =
    existingCoTenantAt ?? incomingCoTenantAt ?? (coTenantRequired ? null : submissionCompletedAt)
  const fullySigned =
    Boolean(nextLandlordAt) &&
    Boolean(nextStudentAt) &&
    (!coTenantRequired || Boolean(nextCoTenantAt))

  const previousStatus = typeof docRow.status === 'string' ? docRow.status : 'sent_for_signing'
  const nextStatus = nextTenancyDocumentStatusAfterSync({ previousStatus, fullySigned })

  return { nextLandlordAt, nextStudentAt, nextCoTenantAt, fullySigned, nextStatus }
}

export function isSubmissionFullySignedOnDocuseal(
  submissionPayload: unknown,
  coTenantRequired: boolean,
): boolean {
  const status = submissionStatusFromPayload(submissionPayload)
  if (status !== 'completed') return false
  const { fullySigned } = computeSignatureTimestamps({
    docRow: {
      id: '',
      tenancy_id: null,
      docuseal_submission_id: null,
      metadata: null,
      status: 'sent_for_signing',
      landlord_signed_at: null,
      student_signed_at: null,
      co_tenant_signed_at: null,
      file_path: null,
    },
    submissionPayload,
    coTenantRequired,
  })
  return fullySigned
}

function timestampsMatchDocuseal(
  localAt: string | null,
  docusealAt: string | null,
): boolean {
  if (!localAt || !docusealAt) return false
  return localAt.trim() === docusealAt.trim()
}

export async function storageObjectExists(
  admin: SupabaseClient,
  filePath: string | null | undefined,
): Promise<boolean> {
  const path = typeof filePath === 'string' ? filePath.trim() : ''
  if (!path) return false
  const { error } = await admin.storage.from('tenancy-documents').download(path)
  return !error
}

export async function isDocusealReconcileInSync(args: {
  admin: SupabaseClient
  docRow: TenancyDocumentSyncRow
  submissionPayload: unknown
  booking: BookingReinstateRow
  coTenantRequired: boolean
}): Promise<boolean> {
  const { admin, docRow, submissionPayload, booking, coTenantRequired } = args
  const incomingLandlordAt = extractCompletedAt(submissionPayload, 'landlord')
  const incomingStudentAt = extractCompletedAt(submissionPayload, 'tenant')
  const incomingCoTenantAt = extractCompletedAt(submissionPayload, 'co_tenant')

  if (docRow.status !== 'signed') return false
  if (
    !timestampsMatchDocuseal(docRow.landlord_signed_at, incomingLandlordAt) ||
    !timestampsMatchDocuseal(docRow.student_signed_at, incomingStudentAt)
  ) {
    return false
  }
  if (coTenantRequired && !timestampsMatchDocuseal(docRow.co_tenant_signed_at, incomingCoTenantAt)) {
    return false
  }

  const fileOk = await storageObjectExists(admin, docRow.file_path)
  if (!fileOk) return false

  const targetStatus = targetBookingStatusAfterReinstate(booking.bond_received_by_landlord_at)
  if (booking.status === 'expired') return false
  if (booking.status !== targetStatus) return false

  return true
}

export function localLeaseDocLooksUnsigned(doc: {
  landlord_signed_at?: string | null
  student_signed_at?: string | null
  co_tenant_signed_at?: string | null
}): boolean {
  const set = (v: unknown) => Boolean(v && String(v).trim())
  return !set(doc.landlord_signed_at) && !set(doc.student_signed_at) && !set(doc.co_tenant_signed_at)
}

/**
 * Defense-in-depth: when local *_signed_at columns are all null but a DocuSeal submission
 * exists, GET the submission and write through timestamps (and finalize PDF if fully signed).
 */
export async function refreshUnsignedLeaseSignaturesFromDocuseal(
  admin: SupabaseClient,
  docRow: TenancyDocumentSyncRow,
): Promise<{ doc: TenancyDocumentSyncRow; refreshed: boolean }> {
  const submissionId =
    typeof docRow.docuseal_submission_id === 'string' ? docRow.docuseal_submission_id.trim() : ''
  if (!submissionId) return { doc: docRow, refreshed: false }
  if (!localLeaseDocLooksUnsigned(docRow)) return { doc: docRow, refreshed: false }

  const submissionPayload = await fetchDocusealSubmission(submissionId)
  const sync = await syncFullySignedDocusealSubmission({
    admin,
    docRow,
    submissionId,
    submissionPayload,
    metadataExtra: {
      last_signature_refresh_at: new Date().toISOString(),
    },
    eventOptions: {
      source: 'refresh',
      actorType: 'system',
      ensureMissing: true,
    },
  })

  return {
    refreshed: true,
    doc: {
      ...docRow,
      status: sync.fullySigned ? 'signed' : docRow.status === 'signed' ? 'signed' : 'sent_for_signing',
      landlord_signed_at: sync.nextLandlordAt,
      student_signed_at: sync.nextStudentAt,
      co_tenant_signed_at: sync.nextCoTenantAt,
      file_path: sync.signedPath ?? docRow.file_path,
    },
  }
}

export type SyncDocusealEventOptions = DocusealEventActor & {
  source: DocusealEventSource
  /** Fill missing booking_events when columns already match DocuSeal (historical). */
  ensureMissing?: boolean
  /** Fail-closed for signature / fully_signed inserts (default true). */
  required?: boolean
}

export async function syncFullySignedDocusealSubmission(args: {
  admin: SupabaseClient
  docRow: TenancyDocumentSyncRow
  submissionId: string
  submissionPayload: unknown
  metadataExtra?: Record<string, unknown>
  /** When set, emit document.signature_recorded / document.fully_signed (same shapes as webhook). */
  eventOptions?: SyncDocusealEventOptions | null
}): Promise<SyncFullySignedResult> {
  const { admin, docRow, submissionId, submissionPayload, metadataExtra = {}, eventOptions } = args
  if (!docRow.tenancy_id) {
    throw new Error('tenancy_document missing tenancy_id')
  }

  const { rowMeta, isResidentialTenancyPackage, isQldResidentialPackage, isVicResidentialPackage } =
    parseDocMetadata(docRow)

  const coTenantRequired = await isCoTenantRequiredForTenancy(
    admin,
    docRow.tenancy_id,
    isResidentialTenancyPackage,
  )

  const before = {
    landlordSignedAt: docRow.landlord_signed_at,
    studentSignedAt: docRow.student_signed_at,
    coTenantSignedAt: docRow.co_tenant_signed_at,
  }
  const wasFullySigned = docRow.status === 'signed'

  const { nextLandlordAt, nextStudentAt, nextCoTenantAt, fullySigned, nextStatus } =
    computeSignatureTimestamps({
      docRow,
      submissionPayload,
      coTenantRequired,
    })

  let nextMetadata: Record<string, unknown> = { ...rowMeta, ...metadataExtra }

  const emitSyncEvents = async (signedPath: string | null) => {
    if (!eventOptions || !docRow.tenancy_id) return
    const bookingIds = await loadBookingIdsForTenancy(admin, docRow.tenancy_id)
    if (!bookingIds) return
    await emitDocusealSyncBookingEvents(
      admin,
      {
        ...bookingIds,
        documentId: docRow.id,
        submissionId,
        before,
        after: {
          landlordSignedAt: nextLandlordAt,
          studentSignedAt: nextStudentAt,
          coTenantSignedAt: coTenantRequired ? nextCoTenantAt : null,
        },
        fullySigned,
        wasFullySigned,
        source: eventOptions.source,
        signedPath,
        ensureMissing: eventOptions.ensureMissing,
        actorType: eventOptions.actorType,
        actorId: eventOptions.actorId,
        actorLabel: eventOptions.actorLabel,
      },
      { required: eventOptions.required !== false },
    )
  }

  // Always persist per-party timestamps (and keep sent_for_signing until fully signed).
  // Do not require PDF download for partial signatures — that blocked *_signed_at writes.
  if (!fullySigned) {
    const { error: partialErr } = await admin
      .from('tenancy_documents')
      .update({
        status: nextStatus,
        landlord_signed_at: nextLandlordAt,
        student_signed_at: nextStudentAt,
        co_tenant_signed_at: coTenantRequired ? nextCoTenantAt : null,
        metadata: nextMetadata as Json,
      })
      .eq('id', docRow.id)
    if (partialErr) throw partialErr

    const signedPath = typeof docRow.file_path === 'string' ? docRow.file_path : null
    await emitSyncEvents(signedPath)

    return {
      fullySigned: false,
      signedPath,
      signedUrl: null,
      isResidentialTenancyPackage,
      isQldResidentialPackage,
      isVicResidentialPackage,
      nextLandlordAt,
      nextStudentAt,
      nextCoTenantAt,
    }
  }

  let signedPath: string

  if (isResidentialTenancyPackage) {
    const dual = await downloadSignedResidentialTenancyPackagePartsFromDocuseal(submissionId)
    const rtaPath = isVicResidentialPackage
      ? `${docRow.tenancy_id}/residential_tenancy/vic_residential_rental_agreement_signed.pdf`
      : isQldResidentialPackage
        ? `${docRow.tenancy_id}/residential_tenancy/qld_form18a_general_tenancy_agreement_signed.pdf`
        : `${docRow.tenancy_id}/residential_tenancy/nsw_residential_tenancy_agreement_signed.pdf`
    const addendumPath = `${docRow.tenancy_id}/residential_tenancy/quni_platform_addendum_signed.pdf`

    if (dual) {
      const { error: upRta } = await admin.storage
        .from('tenancy-documents')
        .upload(rtaPath, dual.rta, { contentType: 'application/pdf', upsert: true })
      const { error: upAdd } = await admin.storage
        .from('tenancy-documents')
        .upload(addendumPath, dual.addendum, { contentType: 'application/pdf', upsert: true })
      if (upRta) throw upRta
      if (upAdd) throw upAdd
      signedPath = rtaPath
      nextMetadata = {
        ...nextMetadata,
        signed_rta_file_path: rtaPath,
        signed_addendum_file_path: addendumPath,
      }
    } else {
      const pdfBuf = await downloadSignedSubmissionPdfFromDocuseal(submissionId, true)
      signedPath = `${docRow.tenancy_id}/residential_tenancy/residential_tenancy_agreement_and_addendum_signed.pdf`
      const { error: upStorageErr } = await admin.storage
        .from('tenancy-documents')
        .upload(signedPath, pdfBuf, { contentType: 'application/pdf', upsert: true })
      if (upStorageErr) throw upStorageErr
    }
  } else {
    const pdfBuf = await downloadSignedSubmissionPdfFromDocuseal(submissionId, false)
    signedPath = `${docRow.tenancy_id}/lease/lease_signed.pdf`
    const { error: upStorageErr } = await admin.storage
      .from('tenancy-documents')
      .upload(signedPath, pdfBuf, { contentType: 'application/pdf', upsert: true })
    if (upStorageErr) throw upStorageErr
  }

  const { data: signedUrlData } = await admin.storage
    .from('tenancy-documents')
    .createSignedUrl(signedPath, 60 * 60 * 24 * 7)

  const { error: upDocErr } = await admin
    .from('tenancy_documents')
    .update({
      status: nextStatus,
      file_path: signedPath,
      landlord_signed_at: nextLandlordAt,
      student_signed_at: nextStudentAt,
      co_tenant_signed_at: coTenantRequired ? nextCoTenantAt : null,
      metadata: nextMetadata as Json,
    })
    .eq('id', docRow.id)

  if (upDocErr) throw upDocErr

  await emitSyncEvents(signedPath)

  // Listing: confirmed → active when bond + signature both done (order-independent).
  // Soft-fail — do not break webhook / reconcile if advance fails.
  try {
    if (docRow.tenancy_id) {
      const bookingIds = await loadBookingIdsForTenancy(admin, docRow.tenancy_id)
      if (bookingIds?.bookingId) {
        const { maybeAdvanceListingBookingToActive } = await import(
          '../booking/maybeAdvanceListingBookingToActive.js'
        )
        await maybeAdvanceListingBookingToActive(admin, bookingIds.bookingId, {
          assumeLeaseFullySigned: true,
        })
      }
    }
  } catch (advErr) {
    console.warn('[syncFullySignedDocusealSubmission] maybeAdvanceListingBookingToActive', advErr)
  }

  return {
    fullySigned,
    signedPath,
    signedUrl: signedUrlData?.signedUrl ?? null,
    isResidentialTenancyPackage,
    isQldResidentialPackage,
    isVicResidentialPackage,
    nextLandlordAt,
    nextStudentAt,
    nextCoTenantAt,
  }
}

export type ReinstateResult = {
  changes: string[]
  bookingStatusBefore: string
  bookingStatusAfter: string
}

export async function reinstateBookingAfterDocusealReconcile(args: {
  admin: SupabaseClient
  booking: BookingReinstateRow
  tenancy: TenancyReinstateRow | null
}): Promise<ReinstateResult> {
  const { admin, booking, tenancy } = args
  const changes: string[] = []
  const bookingStatusBefore = booking.status
  let bookingStatusAfter = booking.status

  if (tenancy?.status === 'ended') {
    const { error: tenancyErr } = await admin
      .from('tenancies')
      .update({ status: 'active' })
      .eq('id', tenancy.id)
      .eq('status', 'ended')
    if (tenancyErr) throw tenancyErr
    changes.push('tenancy: ended → active')
  }

  if (booking.status !== 'expired') {
    return { changes, bookingStatusBefore, bookingStatusAfter }
  }

  const targetStatus = targetBookingStatusAfterReinstate(booking.bond_received_by_landlord_at)
  const patch: Record<string, unknown> = {
    status: targetStatus,
    expired_at: null,
  }
  if (targetStatus === 'bond_pending') {
    patch.bond_window_expires_at = listingBondWindowExpiresAt()
  }

  const { error: bookingErr } = await admin.from('bookings').update(patch).eq('id', booking.id)
  if (bookingErr) throw bookingErr
  bookingStatusAfter = targetStatus
  changes.push(`booking: expired → ${targetStatus}`)
  if (targetStatus === 'bond_pending') {
    changes.push('bond_window_expires_at refreshed (+7 days)')
  }

  if (
    booking.service_tier_final === 'listing' &&
    booking.listing_agreement_status === 'voided'
  ) {
    await setListingAgreementStatus(admin, booking.id, 'ready', null)
    changes.push('listing_agreement_status: voided → ready')
  }

  return { changes, bookingStatusBefore, bookingStatusAfter }
}

export function isWithdrawnBookingStatus(status: string | null | undefined): boolean {
  const s = (status ?? '').trim()
  return s === 'cancelled' || s === 'declined'
}

export async function findBondPendingExpiredRefundMarker(
  admin: SupabaseClient,
  bookingId: string,
): Promise<{ found: boolean; metadata: Record<string, unknown> | null }> {
  const { findLatestLifecycleEvent } = await import('../booking/events/findLatestLifecycleEvent.js')
  const ev = await findLatestLifecycleEvent(admin, {
    bookingId,
    bookingEventType: 'bond.pending_expired',
    steEventType: 'bond_pending_expired',
  })
  return { found: ev.found, metadata: ev.metadata }
}

const LEASE_DOC_TYPES = ['lease', 'residential_tenancy'] as const

export async function loadLatestLeaseDocForBooking(
  admin: SupabaseClient,
  bookingId: string,
): Promise<{ tenancy: TenancyReinstateRow | null; doc: TenancyDocumentSyncRow | null }> {
  const { data: tenancy, error: tenancyErr } = await admin
    .from('tenancies')
    .select('id, status')
    .eq('booking_id', bookingId)
    .maybeSingle()

  if (tenancyErr) throw tenancyErr
  if (!tenancy?.id) return { tenancy: null, doc: null }

  const { data: docs, error: docErr } = await admin
    .from('tenancy_documents')
    .select(
      'id, tenancy_id, docuseal_submission_id, metadata, status, landlord_signed_at, student_signed_at, co_tenant_signed_at, file_path, created_at',
    )
    .eq('tenancy_id', tenancy.id)
    .in('document_type', [...LEASE_DOC_TYPES])
    .not('docuseal_submission_id', 'is', null)
    .order('created_at', { ascending: false })

  if (docErr) throw docErr

  const doc =
    (docs ?? []).find((d) => {
      const sid = typeof d.docuseal_submission_id === 'string' ? d.docuseal_submission_id.trim() : ''
      return Boolean(sid)
    }) ?? null

  return {
    tenancy: { id: tenancy.id, status: tenancy.status },
    doc: doc as TenancyDocumentSyncRow | null,
  }
}
