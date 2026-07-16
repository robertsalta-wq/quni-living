/**
 * Landlord accept-readiness checklist — `pending_confirmation` only (NOT awaiting_info / payment_failed;
 * those have no Accept action). Maps landlord account + listing + billing state to the HTML SoT's
 * "Required to accept" gate list, wired to the real confirm-gate predicates
 * (`landlordBookingConfirmGate.ts` / `landlordBookingConfirmAllowed`).
 */
import type { Database } from '../database.types'
import type { LandlordListingBillingSnapshot } from '../landlordListingBilling'
import { landlordProfileHostIdentityVerified } from '../landlordBookingConfirmGate'
import {
  missingNswFt6600ComplianceFieldLabels,
  nswFt6600ComplianceBlockedMessage,
} from '../../../api/lib/documents/propertyFt6600Compliance.js'
import { bookingUsesNswFt6600Generator } from '../../../api/lib/resolveTenancyPackage.js'

export type BookingReviewReadinessGateActionKind =
  | 'verify_identity'
  | 'add_payout_method'
  | 'add_payment_method'
  | 'complete_compliance'
  | 'review_listing'

export type BookingReviewReadinessGateState = 'done' | 'current' | 'todo'

export type BookingReviewReadinessGate = {
  id: string
  label: string
  sub: string
  state: BookingReviewReadinessGateState
  /** Present only when the gate is incomplete. */
  actionLabel?: string
  actionKind?: BookingReviewReadinessGateActionKind
  actionHref?: string
}

export type BookingReviewReadinessGatesProperty = Pick<
  Database['public']['Tables']['properties']['Row'],
  'id' | 'status' | 'property_type' | 'state' | 'is_registered_rooming_house'
>

export type BookingReviewReadinessGatesBooking = Pick<
  Database['public']['Tables']['bookings']['Row'],
  'move_in_date' | 'start_date'
>

export type BookingReviewReadinessGatesInput = {
  /** Tier the landlord is confirming under (three-button flow). */
  selectedConfirmTier: 'listing' | 'managed'
  stripeChargesEnabled: boolean
  adminOverrideVerified: boolean
  property: BookingReviewReadinessGatesProperty | null
  booking: BookingReviewReadinessGatesBooking | null
  /** Listing + boarder/lodger (occupancy agreement) for this property/booking. */
  listingUsesOccupancyAgreement: boolean
  propertyPayoutComplete: boolean
  listingFeeExempt: boolean
  listingBillingLoaded: boolean
  listingBilling: LandlordListingBillingSnapshot | null
}

type GateDef = Omit<BookingReviewReadinessGate, 'state'> & { done: boolean }

function identityGate(input: BookingReviewReadinessGatesInput): GateDef {
  const done = landlordProfileHostIdentityVerified(
    { stripe_charges_enabled: input.stripeChargesEnabled, admin_override_verified: input.adminOverrideVerified },
    input.selectedConfirmTier,
  )
  return {
    id: 'host_identity',
    label: 'Identity verified',
    sub: done ? 'Verified with Stripe' : 'Complete Stripe identity verification to unlock accepting bookings.',
    done,
    actionLabel: 'Verify',
    actionKind: 'verify_identity',
  }
}

function listingActiveGate(input: BookingReviewReadinessGatesInput): GateDef {
  const status = input.property?.status ?? null
  // No property row (shouldn't happen once loaded) or an unrecognised status → don't block on it.
  const done = status == null ? true : status === 'active'
  return {
    id: 'listing_active',
    label: 'Listing is active',
    sub: status === 'active' ? 'Live and visible to renters' : status ? `Currently ${status} — reactivate to accept bookings` : 'Live and visible to renters',
    done,
    actionLabel: 'Review',
    actionKind: 'review_listing',
    actionHref: input.property?.id ? `/landlord/property/edit/${input.property.id}` : undefined,
  }
}

/** Listing + occupancy agreement needs payee bank details; Managed needs a payout-capable Stripe account. */
function payoutMethodGate(input: BookingReviewReadinessGatesInput): GateDef | null {
  if (input.selectedConfirmTier === 'listing') {
    if (!input.listingUsesOccupancyAgreement) return null
    return {
      id: 'payout_method',
      label: 'Add a payout method',
      sub: 'Payee bank details for bond and rent — required for this listing type.',
      done: input.propertyPayoutComplete === true,
      actionLabel: 'Add',
      actionKind: 'add_payout_method',
      actionHref: input.property?.id
        ? `/landlord/property/edit/${input.property.id}#section-pricing-availability`
        : undefined,
    }
  }
  return {
    id: 'payout_method',
    label: 'Add a payout method',
    sub: 'Where rent lands after move-in — backed by your Stripe account.',
    done: input.stripeChargesEnabled === true,
    actionLabel: 'Add',
    actionKind: 'verify_identity',
  }
}

/** Listing acceptance fee card — not required when fee-exempt; Managed doesn't charge a landlord card. */
function billingCardGate(input: BookingReviewReadinessGatesInput): GateDef | null {
  if (input.selectedConfirmTier !== 'listing' || input.listingFeeExempt === true) return null
  const done = input.listingBillingLoaded && input.listingBilling?.hasPaymentMethod === true
  return {
    id: 'billing_card',
    label: 'Confirm a billing card',
    sub: 'Backs the one-off Quni Listing acceptance fee.',
    done,
    actionLabel: 'Add',
    actionKind: 'add_payment_method',
  }
}

/** NSW FT6600 (T2) schedule compliance — only when this booking/property routes to that generator. */
function ft6600Gate(input: BookingReviewReadinessGatesInput): GateDef | null {
  if (!input.property || !input.booking) return null
  if (!bookingUsesNswFt6600Generator(input.booking, input.property)) return null
  const missing = missingNswFt6600ComplianceFieldLabels(input.property)
  return {
    id: 'ft6600_compliance',
    label: 'Property compliance details',
    sub: missing.length > 0 ? nswFt6600ComplianceBlockedMessage(missing) : 'Complete',
    done: missing.length === 0,
    actionLabel: 'Complete',
    actionKind: 'complete_compliance',
    actionHref: input.property?.id ? `/landlord/property/edit/${input.property.id}` : undefined,
  }
}

function resolveGateDefs(input: BookingReviewReadinessGatesInput): GateDef[] {
  return [identityGate(input), listingActiveGate(input), payoutMethodGate(input), billingCardGate(input), ft6600Gate(input)].filter(
    (g): g is GateDef => g != null,
  )
}

/**
 * Ordered gate list with UI state — the first incomplete gate is "current" (drives the driver's
 * hint copy), later incomplete gates are "todo". Caller (landlord review page) only renders this
 * for `booking.status === 'pending_confirmation'`.
 */
export function resolveBookingReviewReadinessGates(input: BookingReviewReadinessGatesInput): BookingReviewReadinessGate[] {
  const defs = resolveGateDefs(input)
  const firstIncompleteIndex = defs.findIndex((d) => !d.done)
  return defs.map((d, i) => ({
    id: d.id,
    label: d.label,
    sub: d.sub,
    state: d.done ? 'done' : i === firstIncompleteIndex ? 'current' : 'todo',
    ...(d.done
      ? {}
      : { actionLabel: d.actionLabel, actionKind: d.actionKind, actionHref: d.actionHref }),
  }))
}

export function bookingReviewReadinessAllClear(gates: BookingReviewReadinessGate[]): boolean {
  return gates.length > 0 && gates.every((g) => g.state === 'done')
}

/** Short hint under the progress bar — mirrors the first incomplete gate's label. */
export function bookingReviewReadinessHint(gates: BookingReviewReadinessGate[]): string | null {
  const current = gates.find((g) => g.state === 'current')
  return current ? `${current.label} to unlock accepting this request.` : null
}

/**
 * Green ready ribbon only when gates are clear AND Accept is actually allowed.
 * Non-gate blockers (module paused / billing unavailable) must not show the ribbon.
 */
export function bookingReviewShowReadyRibbon(args: {
  readinessAllClear: boolean
  canConfirm: boolean
}): boolean {
  return args.readinessAllClear && args.canConfirm
}

/** True when gates look done but Accept is still blocked by a non-gate reason. */
export function bookingReviewHasNonGateBlocker(args: {
  readinessAllClear: boolean
  canConfirm: boolean
}): boolean {
  return args.readinessAllClear && !args.canConfirm
}
