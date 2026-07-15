import type { TenantBookingStatus } from './tenantCurrentBooking'
import {
  landlordResponseExpiryLabel,
  resolveLandlordResponseExpiryTier,
} from './booking/landlordResponseExpiry'

export type TenantBookingAtAGlanceKind =
  | 'request_submitted'
  | 'host_accepted'
  | 'confirmed'
  | 'action_needed'
  | null

export function tenantBookingAtAGlanceKind(status: TenantBookingStatus): TenantBookingAtAGlanceKind {
  switch (status) {
    case 'pending_confirmation':
    case 'pending':
    case 'pending_payment':
      return 'request_submitted'
    case 'awaiting_info':
      return 'action_needed'
    case 'bond_pending':
      return 'host_accepted'
    case 'confirmed':
    case 'active':
      return 'confirmed'
    default:
      return null
  }
}

export function tenantBookingStatusLabel(status: TenantBookingStatus): string {
  switch (status) {
    case 'pending_confirmation':
      return 'Request submitted'
    case 'pending_payment':
      return 'Payment required'
    case 'pending':
      return 'Awaiting host'
    case 'awaiting_info':
      return 'More info needed'
    case 'bond_pending':
      return 'Host accepted'
    case 'confirmed':
      return 'Confirmed'
    case 'active':
      return 'Active stay'
    case 'completed':
      return 'Completed'
    case 'declined':
      return 'Declined'
    case 'expired':
      return 'Expired'
    case 'cancelled':
      return 'Cancelled'
    case 'payment_failed':
      return 'Payment failed'
    default: {
      const s = status as string
      return s.replace(/_/g, ' ')
    }
  }
}

export function tenantBookingCardBanner(
  status: TenantBookingStatus,
  serviceTierAtRequest?: string | null,
): { text: string; panelClass: string } | null {
  switch (status) {
    case 'pending_confirmation':
    case 'pending':
    case 'pending_payment':
      return {
        text: `Application submitted - your host will review within ${landlordResponseExpiryLabel(
          resolveLandlordResponseExpiryTier(serviceTierAtRequest),
        )}`,
        panelClass: 'border-t border-admin-warning bg-admin-warning-bg px-5 py-3 text-sm text-admin-warning-fg',
      }
    case 'awaiting_info':
      return {
        text: 'Your host asked for more information - check your messages',
        panelClass: 'border-t border-admin-info bg-admin-info-bg px-5 py-3 text-sm text-admin-info-fg',
      }
    case 'bond_pending':
      return {
        text: 'Host accepted your booking - complete bond and agreement steps below',
        panelClass: 'border-t border-admin-success bg-admin-success-bg px-5 py-3 text-sm text-admin-success-fg',
      }
    case 'confirmed':
    case 'active':
      return {
        text: 'Your booking is confirmed',
        panelClass: 'border-t border-admin-success bg-admin-success-bg px-5 py-3 text-sm text-admin-success-fg',
      }
    default:
      return null
  }
}

export type TenantDashboardStatusStrip = {
  eyebrow: string
  title: string
  detail: string
  containerClass: string
}

export function tenantDashboardStatusStrip(status: TenantBookingStatus): TenantDashboardStatusStrip | null {
  const kind = tenantBookingAtAGlanceKind(status)
  switch (kind) {
    case 'request_submitted':
      return {
        eyebrow: 'Your application',
        title: 'Booking request submitted',
        detail: 'Waiting for your host to review. You’ll be notified by email when they respond.',
        containerClass: 'rounded-admin-lg border border-admin-warning bg-admin-warning-bg px-4 py-4 sm:px-5 sm:py-5 shadow-sm',
      }
    case 'action_needed':
      return {
        eyebrow: 'Action needed',
        title: 'Host needs more information',
        detail: 'Open Messages or your booking below to respond.',
        containerClass: 'rounded-admin-lg border border-admin-info bg-admin-info-bg px-4 py-4 sm:px-5 sm:py-5 shadow-sm',
      }
    case 'host_accepted':
      return {
        eyebrow: 'Host accepted',
        title: 'Complete bond & agreement',
        detail: 'Your host accepted this booking. Sign the agreement and arrange bond to finalise.',
        containerClass: 'rounded-admin-lg border border-admin-success bg-admin-success-bg px-4 py-4 sm:px-5 sm:py-5 shadow-sm',
      }
    case 'confirmed':
      return {
        eyebrow: 'Current booking',
        title: 'Booking confirmed',
        detail: 'Your stay is confirmed on Quni. Details are in your booking card below.',
        containerClass: 'rounded-admin-lg border border-admin-success bg-admin-success-bg px-4 py-4 sm:px-5 sm:py-5 shadow-sm',
      }
    default:
      return null
  }
}
