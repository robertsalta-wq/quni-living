/**
 * Renter pinned obligation band — derived from CURRENT booking/payments state,
 * never reconstructed from booking_events.
 */

import { resolveBookingBondAmountAud } from './resolveBookingBondAmount'

export type RenterObligationBand = {
  title: string
  detail: string
}

function formatAud(amount: number): string {
  return `$${amount.toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
}

function formatDueDate(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null
  const t = iso.trim()
  try {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(`${t}T12:00:00`) : new Date(t)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })
  } catch {
    return null
  }
}

export type RenterObligationBooking = {
  status: string
  bond_amount?: number | null
  weekly_rent?: number | null
  bond_window_expires_at?: string | null
  bond_received_by_landlord_at?: string | null
  service_tier_final?: string | null
  listing_agreement_status?: string | null
}

export type RenterObligationProperty = {
  bond?: number | null
  bond_weeks?: number | null
  rent_per_week?: number | null
} | null

/**
 * Outstanding action for the renter, from live booking state.
 * Returns null when there is nothing actionable to pin.
 */
export function renterBookingObligation(
  booking: RenterObligationBooking,
  property?: RenterObligationProperty,
): RenterObligationBand | null {
  if (booking.status === 'awaiting_info') {
    return {
      title: 'Your landlord needs more information',
      detail: 'Check your messages and reply so your booking can continue.',
    }
  }

  if (booking.status === 'bond_pending') {
    const bondAud = resolveBookingBondAmountAud(
      booking.bond_amount,
      property ?? null,
      booking.weekly_rent ?? property?.rent_per_week ?? null,
    )
    const due = formatDueDate(booking.bond_window_expires_at)
    const bondReceived = Boolean(booking.bond_received_by_landlord_at)

    if (!bondReceived && bondAud != null && bondAud > 0) {
      return {
        title: 'Bond payment due',
        detail: due
          ? `${formatAud(bondAud)} to your landlord by ${due}`
          : `${formatAud(bondAud)} to your landlord`,
      }
    }

    if (!bondReceived && (bondAud == null || bondAud === 0)) {
      return {
        title: 'Confirm your booking steps',
        detail: due
          ? `No bond is due. Complete any remaining agreement steps by ${due}.`
          : 'No bond is due. Complete any remaining agreement steps below.',
      }
    }

    return {
      title: 'Sign your tenancy agreement',
      detail: 'Bond is recorded. Review and sign your agreement to finalise.',
    }
  }

  if (
    (booking.status === 'confirmed' || booking.status === 'active') &&
    booking.listing_agreement_status === 'ready'
  ) {
    // Agreement may still be awaiting a signature in edge cases; lease panel owns CTAs.
    return null
  }

  return null
}
