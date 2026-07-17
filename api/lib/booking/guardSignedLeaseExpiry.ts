import type { SupabaseClient } from '@supabase/supabase-js'
import { recordBookingEvent } from './events/recordBookingEvent.js'

/**
 * Guard: never let the bond-window expiry cron kill a booking whose lease is
 * already fully signed.
 *
 * Background: the DocuSeal completion webhook was mis-pointed for ~a month, so
 * Quni recorded zero signatures. The hourly expiry sweep keys only off
 * `bond_window_expires_at` + `bond_received_by_landlord_at` and has no idea a
 * binding lease exists — it expired a fully-executed, occupied tenancy
 * (Geonho Lee, booking d414f981) and archived/voided the signed agreement.
 *
 * This guard reads local signature state (no DocuSeal round-trip — it must not
 * depend on the same webhook that failed) and blocks expiry when the lease
 * looks executed, emitting `bond.expiry_blocked_signed_lease` so it surfaces
 * loudly instead of failing silent.
 */

const LEASE_DOC_TYPES = ['lease', 'residential_tenancy'] as const

export type LeaseSignatureRow = {
  id: string
  status: string | null
  landlord_signed_at: string | null
  student_signed_at: string | null
  co_tenant_signed_at: string | null
  docuseal_submission_id: string | null
}

export type SignedLeaseGuardBooking = {
  id: string
  landlord_id?: string | null
  student_id?: string | null
}

function isSet(value: unknown): boolean {
  return Boolean(value && String(value).trim())
}

/**
 * Conservative "is this lease executed enough that a cron must not expire it?"
 * Blocks when the document is marked signed, OR both landlord and student have
 * signed. Co-tenant absence never *unblocks* — erring toward keeping the
 * booking alive and surfacing it for a human is the safe direction.
 */
export function leaseDocBlocksBondExpiry(doc: LeaseSignatureRow | null | undefined): boolean {
  if (!doc) return false
  if ((doc.status ?? '').trim() === 'signed') return true
  return isSet(doc.landlord_signed_at) && isSet(doc.student_signed_at)
}

/**
 * Latest lease/residential_tenancy doc for a booking's tenancy. Returns null
 * when there is no tenancy (short-circuits before touching tenancy_documents).
 */
export async function loadLeaseSignatureRowForBooking(
  admin: SupabaseClient,
  bookingId: string,
): Promise<LeaseSignatureRow | null> {
  const { data: tenancy, error: tenancyErr } = await admin
    .from('tenancies')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle()
  if (tenancyErr) throw tenancyErr
  if (!tenancy?.id) return null

  const { data: docs, error: docErr } = await admin
    .from('tenancy_documents')
    .select(
      'id, status, landlord_signed_at, student_signed_at, co_tenant_signed_at, docuseal_submission_id, created_at',
    )
    .eq('tenancy_id', tenancy.id)
    .in('document_type', [...LEASE_DOC_TYPES])
    .order('created_at', { ascending: false })
  if (docErr) throw docErr

  const doc = (docs ?? [])[0]
  return doc ? (doc as LeaseSignatureRow) : null
}

export type SignedLeaseGuardResult =
  | { blocked: false }
  | { blocked: true; documentId: string }

/**
 * Returns { blocked: true } when the booking's lease is fully signed, after
 * emitting `bond.expiry_blocked_signed_lease`. Callers MUST skip expiry when
 * blocked. Event-insert failure does not un-block: safety wins over telemetry.
 */
export async function guardBondExpiryForSignedLease(args: {
  admin: SupabaseClient
  booking: SignedLeaseGuardBooking
  nowIso?: string
}): Promise<SignedLeaseGuardResult> {
  const { admin, booking } = args
  const doc = await loadLeaseSignatureRowForBooking(admin, booking.id)
  if (!leaseDocBlocksBondExpiry(doc)) return { blocked: false }

  try {
    await recordBookingEvent(admin, {
      bookingId: booking.id,
      landlordId: booking.landlord_id ?? null,
      studentId: booking.student_id ?? null,
      eventType: 'bond.expiry_blocked_signed_lease',
      actorType: 'cron',
      outcome: 'n/a',
      occurredAt: args.nowIso ?? new Date().toISOString(),
      documentId: doc!.id,
      provider: doc!.docuseal_submission_id ? 'docuseal' : null,
      providerRef: doc!.docuseal_submission_id ?? null,
      reason: 'lease_fully_signed',
      metadata: {
        service_tier: 'listing',
        doc_status: doc!.status,
        landlord_signed_at: doc!.landlord_signed_at,
        student_signed_at: doc!.student_signed_at,
        co_tenant_signed_at: doc!.co_tenant_signed_at,
      },
    })
  } catch (evErr) {
    console.error('[guard-signed-lease-expiry] event insert', booking.id, evErr)
  }

  return { blocked: true, documentId: doc!.id }
}
