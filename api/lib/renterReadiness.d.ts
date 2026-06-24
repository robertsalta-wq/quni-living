export type VerificationTier = 'student' | 'identity' | 'none'

export function computeVerificationTierEligible(
  profile: Record<string, unknown> | null | undefined,
): VerificationTier

export function effectiveVerificationTier(
  profile: Record<string, unknown> | null | undefined,
): VerificationTier

export function tierToSync(
  profile: Record<string, unknown> | null | undefined,
): VerificationTier | null

export function computeRenterReadiness(profile: Record<string, unknown> | null | undefined): {
  profileSetupComplete: boolean
  canRequestBooking: boolean
  effectiveVerificationTier: VerificationTier
  blocksBooking: string[]
}
