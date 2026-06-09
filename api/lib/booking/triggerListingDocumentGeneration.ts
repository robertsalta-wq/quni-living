/**
 * Listing-tier document generation — direct module call (no internal HTTP).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../src/lib/database.types.js'
import type { ListingDocGenResult } from './listingAgreementTypes.js'
import { runListingTenancyGeneration } from '../documents/listingTenancyGeneration/index.js'
import { resolveListingTenancyGenerator } from '../documents/listingTenancyGeneration/resolveGenerator.js'

type TriggerArgs = {
  admin: SupabaseClient<Database>
  bookingId: string
  deferSigning?: boolean
  logger?: Pick<Console, 'warn' | 'error'>
}

/**
 * Resolve the right document generator for a Listing booking and run it directly.
 * Callers MUST branch on `result.ok` — ignored failures are a production defect.
 */
export async function triggerListingDocumentGeneration(args: TriggerArgs): Promise<ListingDocGenResult> {
  const { admin, bookingId, deferSigning = false, logger } = args
  const log = logger ?? console

  const resolved = await resolveListingTenancyGenerator(admin, bookingId)
  if (!resolved.ok) {
    log.warn('[trigger-listing-doc] resolve failed', resolved)
    if (resolved.status === 404) {
      return { ok: true, skipped: true, reason: 'booking_not_found' }
    }
    if (resolved.error.includes('missing property')) {
      return { ok: true, skipped: true, reason: 'no_property' }
    }
    if (resolved.error.includes('not supported')) {
      return { ok: true, skipped: true, reason: 'tenancy_unsupported' }
    }
    return { ok: false, status: resolved.status, error: resolved.error, detail: resolved.detail }
  }

  const result = await runListingTenancyGeneration(admin, bookingId, {
    deferSigning: Boolean(deferSigning),
    generator: resolved.generator,
  })

  if (!result.ok) {
    log.error('[trigger-listing-doc] generation failed', result)
  }

  return result
}
