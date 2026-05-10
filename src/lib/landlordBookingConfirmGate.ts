import type { LandlordListingBillingSnapshot } from './landlordListingBilling'

export type ConfirmBlockedBanner =
  | null
  | 'listing_billing_unavailable'
  | 'listing_module_disabled'
  | 'listing_no_payment_method'
  | 'managed_connect_required'

export function landlordBookingConfirmAllowed(args: {
  bookingStatus: string
  /** Tier the landlord will confirm (three-button flow); drives Listing vs Managed gates. */
  selectedConfirmTier: 'listing' | 'managed'
  listingBillingLoaded: boolean
  listingBilling: LandlordListingBillingSnapshot | null
  landlordStripeReady: boolean
}): boolean {
  const st = args.bookingStatus
  if (st !== 'pending_confirmation' && st !== 'awaiting_info') return false

  if (args.selectedConfirmTier === 'listing') {
    if (!args.listingBillingLoaded) return false
    const lb = args.listingBilling
    if (!lb) return false
    return lb.moduleEnabled === true && lb.hasPaymentMethod === true
  }

  return args.landlordStripeReady
}

export function landlordBookingConfirmBlockedBanner(args: {
  bookingStatus: string
  selectedConfirmTier: 'listing' | 'managed'
  listingBillingLoaded: boolean
  listingBilling: LandlordListingBillingSnapshot | null
  landlordStripeReady: boolean
}): ConfirmBlockedBanner {
  if (args.bookingStatus !== 'pending_confirmation' && args.bookingStatus !== 'awaiting_info') {
    return null
  }

  if (args.selectedConfirmTier !== 'listing') {
    return args.landlordStripeReady ? null : 'managed_connect_required'
  }

  if (!args.listingBillingLoaded) return null
  if (!args.listingBilling) return 'listing_billing_unavailable'

  const lb = args.listingBilling
  if (!lb.moduleEnabled) return 'listing_module_disabled'
  if (!lb.hasPaymentMethod) return 'listing_no_payment_method'
  return null
}
