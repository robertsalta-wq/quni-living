import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../../src/lib/database.types.js'
import type { ListingDocGenResult, ListingPreflightResult } from '../../booking/listingAgreementTypes.js'
import {
  assertStudentLegalNameForSigningByBookingId,
  TENANT_LEGAL_NAME_NOT_READY_CODE,
  TenantLegalNameNotReadyError,
} from '../../booking/assertStudentLegalNameForSigning.js'
import { getListingTenancyGenerator } from './registry.js'
import { resolveListingTenancyGenerator } from './resolveGenerator.js'

async function gateTenantLegalNameForListingDoc(
  admin: SupabaseClient<Database>,
  bookingId: string,
): Promise<ListingPreflightResult | ListingDocGenResult | null> {
  try {
    await assertStudentLegalNameForSigningByBookingId(admin, bookingId)
    return null
  } catch (e) {
    if (e instanceof TenantLegalNameNotReadyError) {
      return {
        ok: false,
        status: 409,
        error: TENANT_LEGAL_NAME_NOT_READY_CODE,
        detail: e.message,
      }
    }
    throw e
  }
}

export async function preflightListingTenancyDocument(
  admin: SupabaseClient<Database>,
  bookingId: string,
): Promise<ListingPreflightResult> {
  const gateFail = await gateTenantLegalNameForListingDoc(admin, bookingId)
  if (gateFail && !gateFail.ok) {
    return gateFail
  }

  const resolved = await resolveListingTenancyGenerator(admin, bookingId)
  if (!resolved.ok) {
    return { ok: false, status: resolved.status, error: resolved.error, detail: resolved.detail }
  }

  const mod = getListingTenancyGenerator(resolved.generator)
  if (!mod) {
    return {
      ok: false,
      status: 500,
      error: 'No document generator configured for this tenancy package',
      detail: resolved.generator,
    }
  }

  return mod.preflight(admin, bookingId)
}

export async function runListingTenancyGeneration(
  admin: SupabaseClient<Database>,
  bookingId: string,
  opts: { deferSigning: boolean; generator?: string },
): Promise<ListingDocGenResult> {
  const gateFail = await gateTenantLegalNameForListingDoc(admin, bookingId)
  if (gateFail && !gateFail.ok) {
    return gateFail
  }

  let generator = opts.generator
  if (!generator) {
    const resolved = await resolveListingTenancyGenerator(admin, bookingId)
    if (!resolved.ok) {
      return { ok: false, status: resolved.status, error: resolved.error, detail: resolved.detail }
    }
    generator = resolved.generator
  }

  const mod = getListingTenancyGenerator(generator)
  if (!mod) {
    return {
      ok: false,
      status: 500,
      error: 'No document generator configured for this tenancy package',
      detail: generator,
    }
  }

  const result = await mod.run(admin, bookingId, { deferSigning: opts.deferSigning })

  if (result.ok && !('skipped' in result && result.skipped) && 'documentId' in result && result.documentId) {
    try {
      const { data: booking } = await admin
        .from('bookings')
        .select('landlord_id, student_id')
        .eq('id', bookingId)
        .maybeSingle()
      const { emitDocumentGenerated } = await import('../../booking/events/emitDocusealDocumentEvents.js')
      await emitDocumentGenerated(admin, {
        bookingId,
        landlordId: booking?.landlord_id ?? null,
        studentId: booking?.student_id ?? null,
        documentId: result.documentId,
        generator,
        deferSigning: opts.deferSigning,
        actorType: 'system',
      })
    } catch (evErr) {
      console.error('[listing-tenancy-gen] document.generated', bookingId, evErr)
    }
  }

  return result
}
