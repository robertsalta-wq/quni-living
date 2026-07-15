/**
 * Zone 3 "money block" — marketplace pattern (lead with what Quni holds / what the host gets).
 * Rules are locked in docs/booking-pages-handoff.md §4 + §4.1. Do not add totals here: `lease_length`
 * is a free string and `end_date` isn't always set, so weekly × weeks is not always computable.
 */

export type BookingMoneyBlockTier = 'listing' | 'managed'

export type BookingMoneyBlockInput = {
  tier: BookingMoneyBlockTier
  /** Booking status — only used to decide the managed "Quni holds" pre-accept vs released state. */
  status: string
  weeklyRentAud: number | null
  bondAud: number | null
  /** Listing only: $99 landlord acceptance fee, waived when the landlord is fee-exempt. */
  listingFeeExempt: boolean
  /** Managed only: one week's rent PaymentIntent, cents. Null on Listing bookings. */
  depositAmountCents: number | null
  /** Managed only: set by the release-deposits cron the day after move-in. */
  depositReleasedAt: string | null
  /** Managed only: platform fee, cents. */
  platformFeeCents: number | null
}

export type BookingMoneyBlockLine = {
  key: string
  label: string
  valueLabel: string
  helpText?: string
  /** "Quni holds $X" — the line the whole block leads to. */
  emphasis?: boolean
}

const PRE_ACCEPT_STATUSES = new Set(['pending', 'pending_payment', 'pending_confirmation', 'awaiting_info'])

function fmtAud(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '-'
  return `$${Number(n).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function fmtAudCents(cents: number | null | undefined): string {
  if (cents == null || !Number.isFinite(Number(cents))) return '-'
  return fmtAud(Number(cents) / 100)
}

/** Managed "Quni holds $X" per §4.1: pre-accept and pre-release both read the held holding deposit; $0 after release. */
export function managedQuniHoldsCents(input: {
  status: string
  depositAmountCents: number | null
  depositReleasedAt: string | null
}): number {
  if (input.depositReleasedAt?.trim()) return 0
  return input.depositAmountCents ?? 0
}

export function computeBookingMoneyBlockLines(input: BookingMoneyBlockInput): BookingMoneyBlockLine[] {
  if (input.tier === 'listing') {
    const listingFeeLabel = input.listingFeeExempt ? '$0.00' : '-$99.00'
    return [
      {
        key: 'rent',
        label: 'Rent to you',
        valueLabel: input.weeklyRentAud != null ? `${fmtAud(input.weeklyRentAud)}/wk` : '-',
      },
      {
        key: 'bond',
        label: 'Bond — paid direct to you',
        valueLabel: input.bondAud != null ? fmtAud(input.bondAud) : 'No bond',
      },
      {
        key: 'listing-fee',
        label: 'Quni listing fee',
        valueLabel: listingFeeLabel,
      },
      {
        key: 'quni-holds',
        label: 'Quni holds',
        valueLabel: '$0',
        helpText: 'Bond and rent are arranged directly between you and the renter.',
        emphasis: true,
      },
    ]
  }

  const isPreAccept = PRE_ACCEPT_STATUSES.has(input.status)
  const holdsCents = managedQuniHoldsCents(input)

  return [
    {
      key: 'rent',
      label: 'Rent',
      valueLabel: input.weeklyRentAud != null ? `${fmtAud(input.weeklyRentAud)}/wk` : '-',
    },
    {
      key: 'bond',
      label: 'Bond',
      valueLabel: input.bondAud != null ? fmtAud(input.bondAud) : 'No bond',
    },
    {
      key: 'holding-deposit',
      label: 'Holding deposit',
      valueLabel: fmtAudCents(input.depositAmountCents),
      helpText: isPreAccept ? 'One week\u2019s rent, authorised on request.' : undefined,
    },
    {
      key: 'platform-fee',
      label: 'Platform fee',
      valueLabel: fmtAudCents(input.platformFeeCents),
    },
    {
      key: 'quni-holds',
      label: 'Quni holds',
      valueLabel: fmtAudCents(holdsCents),
      helpText:
        holdsCents > 0
          ? 'Released to you the day after move-in.'
          : input.depositReleasedAt?.trim()
            ? 'Released to you.'
            : undefined,
      emphasis: true,
    },
  ]
}
