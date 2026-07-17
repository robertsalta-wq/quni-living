import type { SupabaseClient } from '@supabase/supabase-js'

export function sendReinstatementRequestEmails(
  admin: SupabaseClient,
  bookingId: string,
  meta: {
    requesterRole: 'landlord' | 'tenant'
    otherPartyRole: 'landlord' | 'tenant'
    graceWindowExpiresAt: string
  },
): Promise<void>

export function sendReinstatementConfirmedEmails(
  admin: SupabaseClient,
  bookingId: string,
  meta: {
    signingResent: boolean
    signingResendFailed: boolean
    listingFeeRefunded: boolean
    bookingStatusAfter: string
  },
): Promise<void>

export function sendReinstatementDeclinedEmails(
  admin: SupabaseClient,
  bookingId: string,
  meta: { declinedByRole: 'landlord' | 'tenant' },
): Promise<void>

export function sendReinstatementCancelledEmails(
  admin: SupabaseClient,
  bookingId: string,
  meta: { cancelledByRole: 'landlord' | 'tenant' },
): Promise<void>

export function sendReinstatementBlockedUnavailableEmails(
  admin: SupabaseClient,
  bookingId: string,
): Promise<void>
