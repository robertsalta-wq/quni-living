/**
 * Pure landlord booking-review primary-action derivation.
 * Behavior-preserving extract from LandlordBookingReviewPage (showMarkBondReceived /
 * primaryActionKind / actionCopyStatus override). Unit-testable — #55 lived in page JSX.
 */
import type { BookingReviewActionStatus } from './bookingReviewActionModel'
import { landlordListingBondReceivedPrimaryVisible } from '../landlordListingBondReceivedGate'
import { isBondPaymentReceiptContext } from '../listings'

export type LandlordPrimaryActionKind =
  | 'bond-received'
  | 'mark-bond'
  | 'accept-decline-info'
  | 'none'

export type LandlordPrimaryAction = {
  kind: LandlordPrimaryActionKind
  /** Status passed into resolveLandlordBookingReviewActionCopy */
  copyStatus: BookingReviewActionStatus
  /** When true, page suppresses the top deadline pill (bond-received has its own callout). */
  suppressDeadlinePill: boolean
}

export type DeriveLandlordPrimaryActionInput = {
  bookingStatus: string
  serviceTierFinal: string | null | undefined
  bookingLandlordId: string | null | undefined
  viewerLandlordProfileId: string | null | undefined
  bondReceivedByLandlordAt: string | null | undefined
  hasTenancy: boolean
  tenancyBondLodgedAt: string | null | undefined
  tenancyBondLodgementReference: string | null | undefined
  propertyType: string | null | undefined
  hasProperty: boolean
}

function showMarkBondReceived(input: DeriveLandlordPrimaryActionInput): boolean {
  return (
    input.hasTenancy &&
    !input.tenancyBondLodgedAt &&
    !input.tenancyBondLodgementReference &&
    input.bondReceivedByLandlordAt == null &&
    input.hasProperty &&
    isBondPaymentReceiptContext(input.propertyType) &&
    (input.bookingStatus === 'confirmed' ||
      input.bookingStatus === 'active' ||
      input.bookingStatus === 'completed')
  )
}

/**
 * Derives landlord primary action kind + which status drives action-card copy.
 * Priority matches the page: bond-received → mark-bond → accept-decline-info → none.
 */
export function deriveLandlordPrimaryAction(
  input: DeriveLandlordPrimaryActionInput,
): LandlordPrimaryAction {
  const showBondReceivedPrimary = landlordListingBondReceivedPrimaryVisible({
    bookingStatus: input.bookingStatus,
    serviceTierFinal: input.serviceTierFinal,
    bookingLandlordId: input.bookingLandlordId,
    viewerLandlordProfileId: input.viewerLandlordProfileId,
  })

  const isPreAcceptStatus = input.bookingStatus === 'pending_confirmation'

  const kind: LandlordPrimaryActionKind = showBondReceivedPrimary
    ? 'bond-received'
    : showMarkBondReceived(input)
      ? 'mark-bond'
      : isPreAcceptStatus
        ? 'accept-decline-info'
        : 'none'

  // mark-bond borrows bond_pending copy ("Confirm the bond") — the #55 override.
  const copyStatus: BookingReviewActionStatus =
    kind === 'mark-bond' ? 'bond_pending' : (input.bookingStatus as BookingReviewActionStatus)

  return {
    kind,
    copyStatus,
    suppressDeadlinePill: kind === 'bond-received',
  }
}
