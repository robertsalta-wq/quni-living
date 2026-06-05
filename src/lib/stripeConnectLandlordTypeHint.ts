/**
 * Short copy for Stripe Connect UI based on landlord_profiles.landlord_type.
 */
export function stripeConnectLandlordTypeHint(landlordType: string | null | undefined): string | null {
  if (landlordType === 'company' || landlordType === 'trust') {
    return 'Your Quni profile is set to Company/Trust - Stripe will ask for business details (ABN, legal name).'
  }
  if (landlordType === 'individual') {
    return 'Your Quni profile is set to Individual - Stripe should ask for personal details, not a company ABN.'
  }
  return null
}
