import type { LandlordListingBillingSnapshot } from './landlordListingBilling'
import type { Database } from './database.types'
import {
  missingNswFt6600ComplianceFieldLabels,
  nswFt6600ComplianceBlockedMessage,
} from '../../api/lib/documents/propertyFt6600Compliance.js'
import { bookingUsesNswFt6600Generator } from '../../api/lib/resolveTenancyPackage.js'

export type LandlordBookingReviewProperty = Database['public']['Tables']['properties']['Row']

export type ConfirmBlockedBanner =
  | null
  | 'listing_billing_unavailable'
  | 'listing_module_disabled'
  | 'listing_no_payment_method'
  | 'host_identity_required'
  | 'ft6600_compliance_incomplete'

function landlordHostIdentityReadyForConfirm(args: {
  selectedConfirmTier: 'listing' | 'managed'
  stripeChargesEnabled: boolean
  adminOverrideVerified: boolean
}): boolean {
  if (args.selectedConfirmTier === 'listing' && args.adminOverrideVerified) {
    return true
  }
  return args.stripeChargesEnabled
}

export function landlordBookingConfirmAllowed(args: {
  bookingStatus: string
  /** Tier the landlord will confirm (three-button flow); drives Listing vs Managed gates. */
  selectedConfirmTier: 'listing' | 'managed'
  listingBillingLoaded: boolean
  listingBilling: LandlordListingBillingSnapshot | null
  stripeChargesEnabled: boolean
  adminOverrideVerified: boolean
  /** When true, Listing acceptance fee is $0 — saved card is not required. */
  listingFeeExempt?: boolean
  property?: LandlordBookingReviewProperty | null
  booking?: Pick<
    Database['public']['Tables']['bookings']['Row'],
    'move_in_date' | 'start_date'
  > | null
}): boolean {
  const st = args.bookingStatus
  if (st !== 'pending_confirmation' && st !== 'awaiting_info') return false

  if (
    !landlordHostIdentityReadyForConfirm({
      selectedConfirmTier: args.selectedConfirmTier,
      stripeChargesEnabled: args.stripeChargesEnabled,
      adminOverrideVerified: args.adminOverrideVerified,
    })
  ) {
    return false
  }

  if (
    args.property &&
    bookingUsesNswFt6600Generator(args.booking ?? null, args.property) &&
    missingNswFt6600ComplianceFieldLabels(args.property).length > 0
  ) {
    return false
  }

  if (args.selectedConfirmTier === 'listing') {
    if (!args.listingBillingLoaded) return false
    const lb = args.listingBilling
    if (!lb) return false
    if (!lb.moduleEnabled) return false
    if (args.listingFeeExempt === true) return true
    return lb.hasPaymentMethod === true
  }

  return true
}

export function landlordBookingConfirmBlockedBanner(args: {
  bookingStatus: string
  selectedConfirmTier: 'listing' | 'managed'
  listingBillingLoaded: boolean
  listingBilling: LandlordListingBillingSnapshot | null
  stripeChargesEnabled: boolean
  adminOverrideVerified: boolean
  listingFeeExempt?: boolean
  property?: LandlordBookingReviewProperty | null
  booking?: Pick<
    Database['public']['Tables']['bookings']['Row'],
    'move_in_date' | 'start_date'
  > | null
}): ConfirmBlockedBanner {
  if (args.bookingStatus !== 'pending_confirmation' && args.bookingStatus !== 'awaiting_info') {
    return null
  }

  if (
    !landlordHostIdentityReadyForConfirm({
      selectedConfirmTier: args.selectedConfirmTier,
      stripeChargesEnabled: args.stripeChargesEnabled,
      adminOverrideVerified: args.adminOverrideVerified,
    })
  ) {
    return 'host_identity_required'
  }

  if (
    args.property &&
    bookingUsesNswFt6600Generator(args.booking ?? null, args.property) &&
    missingNswFt6600ComplianceFieldLabels(args.property).length > 0
  ) {
    return 'ft6600_compliance_incomplete'
  }

  if (args.selectedConfirmTier !== 'listing') {
    return null
  }

  if (!args.listingBillingLoaded) return null
  if (!args.listingBilling) return 'listing_billing_unavailable'

  const lb = args.listingBilling
  if (!lb.moduleEnabled) return 'listing_module_disabled'
  if (args.listingFeeExempt !== true && !lb.hasPaymentMethod) return 'listing_no_payment_method'
  return null
}

/** Short explanation for the review-page action bar when Accept is disabled. */
export function landlordBookingConfirmBlockedUserMessage(
  banner: ConfirmBlockedBanner,
  bookingStatus: string,
  property?: LandlordBookingReviewProperty | null,
): string | null {
  switch (banner) {
    case 'host_identity_required':
      return 'Complete Stripe identity verification on your dashboard before you can accept.'
    case 'listing_no_payment_method':
      return 'Add a saved card for the Listing acceptance fee before you can accept.'
    case 'listing_module_disabled':
      return 'Listing bookings are temporarily paused. Try again in a few minutes.'
    case 'listing_billing_unavailable':
      return 'Could not verify Listing billing. Refresh this page and try again.'
    case 'ft6600_compliance_incomplete':
      if (property) {
        const missing = missingNswFt6600ComplianceFieldLabels(property)
        return nswFt6600ComplianceBlockedMessage(missing)
      }
      return nswFt6600ComplianceBlockedMessage([])
    default:
      if (bookingStatus !== 'pending_confirmation' && bookingStatus !== 'awaiting_info') {
        return 'This booking is no longer waiting for your confirmation.'
      }
      return null
  }
}
