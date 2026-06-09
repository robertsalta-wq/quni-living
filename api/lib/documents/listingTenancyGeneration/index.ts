import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../../src/lib/database.types.js'
import type { ListingDocGenResult, ListingPreflightResult } from '../../booking/listingAgreementTypes.js'
import { getListingTenancyGenerator } from './registry.js'
import { resolveListingTenancyGenerator } from './resolveGenerator.js'

export async function preflightListingTenancyDocument(
  admin: SupabaseClient<Database>,
  bookingId: string,
): Promise<ListingPreflightResult> {
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

  return mod.run(admin, bookingId, { deferSigning: opts.deferSigning })
}
