/**
 * Listing: advance bookings.status confirmed → active once bond AND lease are both done.
 * Order-independent — call from full-sign sync and from markBondReceived.
 * Does not emit booking.status_changed (DB trigger owns that).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

import { fetchCoTenantSignerForTenancy } from './coTenantSigning.js'

/** Sole Listing bond-completion signal for status advance (RTA lodgement fields are record-only). */
export const LISTING_BOND_DONE_FIELD = 'bond_received_by_landlord_at' as const

/** Must never be treated as alternate Listing bond-done for confirmed → active. */
export const LISTING_BOND_DONE_NOT_ALTERNATE_FIELDS = [
  'rta_bond_lodged_at',
  'rta_bond_number',
  'rta_acknowledgement_reference',
] as const

const LEASE_DOC_TYPES = ['lease', 'residential_tenancy'] as const

const EXPECTED_NOOP_REASONS = new Set([
  'not_found',
  'wrong_tier',
  'wrong_status',
  'already_active',
  'missing_bond',
  'not_fully_signed',
  'no_tenancy',
])

export type MaybeAdvanceListingBookingToActiveResult =
  | { advanced: true; from: 'confirmed'; to: 'active' }
  | { advanced: false; reason: string }

function timestampSet(v: string | null | undefined): boolean {
  return Boolean(v && String(v).trim())
}

/** Local-DB fully-signed check — aligned with sync / deriveLeaseDocState; not "signing initiated". */
export function listingLeaseDocLooksFullySigned(
  doc: {
    status: string | null | undefined
    landlord_signed_at: string | null | undefined
    student_signed_at: string | null | undefined
    co_tenant_signed_at: string | null | undefined
  },
  coTenantRequired: boolean,
): boolean {
  if ((doc.status ?? '').trim() === 'signed') return true
  return (
    timestampSet(doc.landlord_signed_at) &&
    timestampSet(doc.student_signed_at) &&
    (!coTenantRequired || timestampSet(doc.co_tenant_signed_at))
  )
}

async function loadLatestLeaseDocForAdvance(
  admin: SupabaseClient,
  tenancyId: string,
): Promise<{
  status: string | null
  landlord_signed_at: string | null
  student_signed_at: string | null
  co_tenant_signed_at: string | null
} | null> {
  const { data: docs, error } = await admin
    .from('tenancy_documents')
    .select('status, landlord_signed_at, student_signed_at, co_tenant_signed_at, created_at')
    .eq('tenancy_id', tenancyId)
    .in('document_type', [...LEASE_DOC_TYPES])
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) throw error
  if (!Array.isArray(docs) || docs.length === 0) return null
  const doc = docs[0]
  return {
    status: typeof doc.status === 'string' ? doc.status : null,
    landlord_signed_at: (doc.landlord_signed_at as string | null) ?? null,
    student_signed_at: (doc.student_signed_at as string | null) ?? null,
    co_tenant_signed_at: (doc.co_tenant_signed_at as string | null) ?? null,
  }
}

function warnAdvance(
  logger: Pick<Console, 'warn'> | undefined,
  msg: string,
  detail?: unknown,
): void {
  const fn = logger?.warn ?? console.warn
  if (detail !== undefined) fn(msg, detail)
  else fn(msg)
}

/**
 * Soft-fail helper: never throws to callers. Unexpected no-ops / errors are warn-logged.
 */
export async function maybeAdvanceListingBookingToActive(
  admin: SupabaseClient,
  bookingId: string,
  opts?: {
    logger?: Pick<Console, 'warn'>
    /** When true, skip lease-doc re-query (caller just persisted fully signed). */
    assumeLeaseFullySigned?: boolean
  },
): Promise<MaybeAdvanceListingBookingToActiveResult> {
  const logger = opts?.logger
  const id = typeof bookingId === 'string' ? bookingId.trim() : ''
  if (!id) {
    warnAdvance(logger, '[maybeAdvanceListingBookingToActive] unexpected: empty bookingId')
    return { advanced: false, reason: 'empty_booking_id' }
  }

  try {
    const { data: booking, error: loadErr } = await admin
      .from('bookings')
      .select('id, status, service_tier_final, bond_received_by_landlord_at')
      .eq('id', id)
      .maybeSingle()

    if (loadErr) {
      warnAdvance(logger, '[maybeAdvanceListingBookingToActive] load booking error', loadErr)
      return { advanced: false, reason: 'db_error' }
    }
    if (!booking) {
      return { advanced: false, reason: 'not_found' }
    }

    if (booking.service_tier_final !== 'listing') {
      return { advanced: false, reason: 'wrong_tier' }
    }

    const status = typeof booking.status === 'string' ? booking.status : ''
    if (status === 'active') {
      return { advanced: false, reason: 'already_active' }
    }
    if (status !== 'confirmed') {
      return { advanced: false, reason: 'wrong_status' }
    }

    const bondAt =
      typeof booking.bond_received_by_landlord_at === 'string'
        ? booking.bond_received_by_landlord_at.trim()
        : ''
    if (!bondAt) {
      return { advanced: false, reason: 'missing_bond' }
    }

    if (!opts?.assumeLeaseFullySigned) {
      const { data: tenancy, error: tenancyErr } = await admin
        .from('tenancies')
        .select('id')
        .eq('booking_id', id)
        .maybeSingle()

      if (tenancyErr) {
        warnAdvance(logger, '[maybeAdvanceListingBookingToActive] load tenancy error', tenancyErr)
        return { advanced: false, reason: 'db_error' }
      }
      if (!tenancy?.id) {
        return { advanced: false, reason: 'no_tenancy' }
      }

      const doc = await loadLatestLeaseDocForAdvance(admin, tenancy.id)
      if (!doc) {
        return { advanced: false, reason: 'not_fully_signed' }
      }

      const coSigner = await fetchCoTenantSignerForTenancy(admin, tenancy.id)
      if (!listingLeaseDocLooksFullySigned(doc, Boolean(coSigner))) {
        return { advanced: false, reason: 'not_fully_signed' }
      }
    }

    const { data: updatedRows, error: upErr } = await admin
      .from('bookings')
      .update({ status: 'active' })
      .eq('id', id)
      .eq('status', 'confirmed')
      .select('id, status')

    if (upErr) {
      warnAdvance(logger, '[maybeAdvanceListingBookingToActive] update error', upErr)
      return { advanced: false, reason: 'update_error' }
    }

    const updated = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows
    if (!updated || updated.status !== 'active') {
      warnAdvance(
        logger,
        '[maybeAdvanceListingBookingToActive] unexpected: guards passed but update matched no confirmed row',
        { bookingId: id },
      )
      return { advanced: false, reason: 'concurrent_miss' }
    }

    return { advanced: true, from: 'confirmed', to: 'active' }
  } catch (e) {
    warnAdvance(logger, '[maybeAdvanceListingBookingToActive] unexpected error', e)
    return { advanced: false, reason: 'unexpected_error' }
  }
}

/** For callers / tests that want to classify noop reasons. */
export function isExpectedAdvanceNoopReason(reason: string): boolean {
  return EXPECTED_NOOP_REASONS.has(reason)
}
