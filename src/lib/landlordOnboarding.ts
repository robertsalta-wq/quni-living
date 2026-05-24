import type { Database } from './database.types'
import type { LandlordServiceTier } from './landlordServiceTier'

export type LandlordProfileRow = Database['public']['Tables']['landlord_profiles']['Row']

const QUNI_LANDLORD_WIZARD_COMPLETE = 'quni_onboarding_complete'

export function setLandlordWizardCompleteLocalStorage(): void {
  try {
    localStorage.setItem(QUNI_LANDLORD_WIZARD_COMPLETE, 'true')
  } catch {
    /* ignore */
  }
}

/** True when the 5-step landlord wizard is finished (DB flag). */
export function isLandlordWizardComplete(p: LandlordProfileRow | null | undefined): boolean {
  return p?.onboarding_complete === true
}

/** Redirect landlords to /onboarding/landlord until the wizard is complete. */
export function landlordNeedsOnboardingWizard(p: LandlordProfileRow | null | undefined): boolean {
  if (!p) return false
  return !isLandlordWizardComplete(p)
}

export function landlordTermsComplete(p: LandlordProfileRow): boolean {
  return Boolean(p.terms_accepted_at && p.landlord_terms_accepted_at)
}

export function landlordStep1FieldsComplete(p: LandlordProfileRow): boolean {
  return Boolean(
    p.first_name?.trim() &&
      p.last_name?.trim() &&
      p.phone?.trim() &&
      p.bio?.trim() &&
      p.landlord_type?.trim() &&
      p.address?.trim() &&
      p.suburb?.trim() &&
      p.postcode?.trim() &&
      p.state?.trim(),
  )
}

export function landlordStripeStepComplete(p: LandlordProfileRow): boolean {
  return p.stripe_charges_enabled === true
}

/** Listing landlords: saved Stripe Customer for off-session Listing fee charges. */
export function landlordListingBillingStepComplete(p: LandlordProfileRow): boolean {
  return Boolean(p.stripe_customer_id?.trim())
}

export function landlordPaymentStepComplete(
  p: LandlordProfileRow,
  intendedTier?: LandlordServiceTier | null,
): boolean {
  if (intendedTier === 'listing') {
    return landlordListingBillingStepComplete(p) || landlordStripeStepComplete(p)
  }
  return landlordStripeStepComplete(p)
}

export function landlordInsuranceStepComplete(p: LandlordProfileRow): boolean {
  return p.insurance_acknowledged_at != null
}

export type LandlordWizardStep = 1 | 2 | 3 | 4 | 5

/** First step that still needs work (for resume). */
export function inferLandlordWizardStep(
  p: LandlordProfileRow,
  intendedTier?: LandlordServiceTier | null,
): LandlordWizardStep {
  if (!landlordStep1FieldsComplete(p)) return 1
  if (!landlordTermsComplete(p)) return 2
  if (!landlordPaymentStepComplete(p, intendedTier)) return 3
  if (!landlordInsuranceStepComplete(p)) return 4
  if (!isLandlordWizardComplete(p)) return 5
  return 5
}
