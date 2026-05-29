/**
 * Sync landlord_profiles.verified from Stripe Connect charges_enabled,
 * unless admin_override_verified is set (manual support override).
 */

/**
 * @param {boolean | null | undefined} chargesEnabled
 * @returns {boolean}
 */
export function verifiedFromStripeChargesEnabled(chargesEnabled) {
  return chargesEnabled === true
}

/**
 * Stripe account.updated fields stored on landlord_profiles (verified handled separately).
 * @param {{ charges_enabled?: boolean; payouts_enabled?: boolean; details_submitted?: boolean }} account
 */
export function stripeConnectProfileFieldsFromAccount(account) {
  return {
    stripe_charges_enabled: account.charges_enabled ?? false,
    stripe_payouts_enabled: account.payouts_enabled ?? false,
    stripe_connect_details_submitted: account.details_submitted ?? false,
  }
}

/**
 * @param {{ charges_enabled?: boolean }} account
 * @param {{ admin_override_verified?: boolean | null }} profile
 */
export function mergeVerifiedIntoLandlordUpdate(account, profile) {
  const base = stripeConnectProfileFieldsFromAccount(account)
  if (profile?.admin_override_verified === true) {
    return base
  }
  return {
    ...base,
    verified: verifiedFromStripeChargesEnabled(account.charges_enabled),
  }
}
