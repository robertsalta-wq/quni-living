import type { Database } from './database.types'
import { looksLikeMissingDbColumn } from './supabaseErrorMessage'
import { supabase } from './supabase'

export { LANDLORD_SERVICE_AGREEMENT_PUBLIC_TITLE } from './landlordServiceAgreementTitle'
export const LANDLORD_SERVICE_AGREEMENT_PATH = '/landlord-service-agreement' as const

/** Listing LSA version. Prefix encodes the product this acceptance is for. Bump when text changes materially. */
export const LANDLORD_SERVICE_AGREEMENT_VERSION = 'listing-1.0'

export const LANDLORD_SERVICE_AGREEMENT_EFFECTIVE_DATE = '3 September 2026'

/** Inclusive start of v1.0. Used only when the version column is not yet present. */
export const LANDLORD_SERVICE_AGREEMENT_EFFECTIVE_AT = '2026-09-03T00:00:00.000Z'

type LandlordProfileRow = Database['public']['Tables']['landlord_profiles']['Row']

export function landlordServiceAgreementAccepted(p: LandlordProfileRow | null | undefined): boolean {
  if (!p?.landlord_terms_accepted_at) return false
  if (p.landlord_service_agreement_version === LANDLORD_SERVICE_AGREEMENT_VERSION) return true
  const stored = p.landlord_service_agreement_version?.trim() ?? ''
  if (stored) return false
  return Date.parse(p.landlord_terms_accepted_at) >= Date.parse(LANDLORD_SERVICE_AGREEMENT_EFFECTIVE_AT)
}

export function landlordServiceAgreementAcceptancePatch(acceptedAt?: string): {
  landlord_terms_accepted_at: string
  landlord_service_agreement_version: string
} {
  return {
    landlord_terms_accepted_at: acceptedAt ?? new Date().toISOString(),
    landlord_service_agreement_version: LANDLORD_SERVICE_AGREEMENT_VERSION,
  }
}

const ACCEPTANCE_SAVE_FAILED = 'Could not save your acceptance. Try again.'

async function updateLandlordProfileReturningUserId(
  userId: string,
  patch: Record<string, string>,
): Promise<{ error: { message: string } | null; data: { user_id: string } | null }> {
  return supabase
    .from('landlord_profiles')
    .update(patch)
    .eq('user_id', userId)
    .select('user_id')
    .maybeSingle()
}

/** Update landlord_profiles, retrying without the version column if the migration is not applied yet. */
export async function updateLandlordProfileAcceptanceFields(
  userId: string,
  patch: Record<string, string>,
): Promise<{ error: Error | null }> {
  const trimmed = userId.trim()
  if (!trimmed) return { error: new Error(ACCEPTANCE_SAVE_FAILED) }

  const first = await updateLandlordProfileReturningUserId(trimmed, patch)
  if (!first.error && first.data?.user_id) return { error: null }
  if (!first.error) return { error: new Error(ACCEPTANCE_SAVE_FAILED) }
  if (!looksLikeMissingDbColumn(first.error) || !('landlord_service_agreement_version' in patch)) {
    return { error: new Error(first.error.message) }
  }
  const rest = { ...patch }
  delete rest.landlord_service_agreement_version
  const second = await updateLandlordProfileReturningUserId(trimmed, rest)
  if (second.error) return { error: new Error(second.error.message) }
  if (!second.data?.user_id) return { error: new Error(ACCEPTANCE_SAVE_FAILED) }
  return { error: null }
}

/** Persist Listing LSA acceptance. Retries without the version column if the migration is not applied yet. */
export async function persistLandlordServiceAgreementAcceptance(
  userId: string,
  acceptedAt?: string,
): Promise<{ error: Error | null }> {
  return updateLandlordProfileAcceptanceFields(userId, landlordServiceAgreementAcceptancePatch(acceptedAt))
}
