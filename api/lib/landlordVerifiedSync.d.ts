export function landlordHostIdentityReadyForConfirm(
  profile: { admin_override_verified?: boolean | null; stripe_charges_enabled?: boolean | null } | null | undefined,
  opts?: { tier?: 'listing' | 'managed' },
): boolean
