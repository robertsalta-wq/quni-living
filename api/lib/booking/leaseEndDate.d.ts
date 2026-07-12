export const ALLOWED_LEASE_TERMS: readonly string[]

export function isPeriodicLeaseLength(leaseLength: string | null | undefined): boolean

export function leaseEndDateFromMoveIn(
  moveInIso: string,
  leaseLength: string | null | undefined,
): string | null
