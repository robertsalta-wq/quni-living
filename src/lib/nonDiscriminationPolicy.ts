import type { Database } from './database.types'

export const NON_DISCRIMINATION_POLICY_PATH = '/non-discrimination' as const

/** Bump when policy text changes materially - landlords must re-accept. */
export const NON_DISCRIMINATION_POLICY_VERSION = '2026-06-05'

type LandlordProfileRow = Database['public']['Tables']['landlord_profiles']['Row']

export function landlordNonDiscriminationAccepted(p: LandlordProfileRow | null | undefined): boolean {
  if (!p?.non_discrimination_policy_accepted_at) return false
  return p.non_discrimination_policy_version === NON_DISCRIMINATION_POLICY_VERSION
}

export function nonDiscriminationAcceptancePatch(acceptedAt?: string): {
  non_discrimination_policy_accepted_at: string
  non_discrimination_policy_version: string
} {
  return {
    non_discrimination_policy_accepted_at: acceptedAt ?? new Date().toISOString(),
    non_discrimination_policy_version: NON_DISCRIMINATION_POLICY_VERSION,
  }
}
