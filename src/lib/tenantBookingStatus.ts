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
        panelClass: 'border-t border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-900',
      }
    case 'awaiting_info':
      return {
        text: 'Your host asked for more information - check your messages',
        panelClass: 'border-t border-sky-100 bg-sky-50 px-5 py-3 text-sm text-sky-900',
      }
    case 'bond_pending':
      return {
        text: 'Host accepted your booking - complete bond and agreement steps below',
        panelClass: 'border-t border-emerald-100 bg-emerald-50 px-5 py-3 text-sm text-emerald-900',
      }
    case 'confirmed':
    case 'active':
      return {
        text: 'Your booking is confirmed',
        panelClass: 'border-t border-green-100 bg-green-50 px-5 py-3 text-sm text-green-800',
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
        containerClass: 'rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 sm:px-5 sm:py-5 shadow-sm',
      }
    case 'action_needed':
      return {
        eyebrow: 'Action needed',
        title: 'Host needs more information',
        detail: 'Open Messages or your booking below to respond.',
        containerClass: 'rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 sm:px-5 sm:py-5 shadow-sm',
      }
    case 'host_accepted':
      return {
        eyebrow: 'Host accepted',
        title: 'Complete bond & agreement',
        detail: 'Your host accepted this booking. Sign the agreement and arrange bond to finalise.',
        containerClass: 'rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 sm:px-5 sm:py-5 shadow-sm',
      }
    case 'confirmed':
      return {
        eyebrow: 'Current booking',
        title: 'Booking confirmed',
        detail: 'Your stay is confirmed on Quni. Details are in your booking card below.',
        containerClass: 'rounded-2xl border border-green-200 bg-green-50 px-4 py-4 sm:px-5 sm:py-5 shadow-sm',
      }
    default:
      return null
  }
}
