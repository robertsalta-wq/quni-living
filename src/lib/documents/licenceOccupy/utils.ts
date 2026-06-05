/** Notice period text aligned to payment method wording (weekly default). */
export function licenceTerminationNoticePhrase(paymentMethod: string): string {
  const m = paymentMethod.toLowerCase()
  if (m.includes('fortnight')) {
    return 'where the licence fee is payable fortnightly, at least two weeks\' written notice;'
  }
  if (m.includes('month')) {
    return 'where the licence fee is payable monthly, at least one calendar month\'s written notice;'
  }
  return 'where the licence fee is payable weekly, at least one week\'s written notice;'
}

/** Mirrors DEFAULT_LISTING_FEE_CENTS in api/lib/pricing/resolvePlatformFee.js */
export const LISTING_TIER_ACCEPTANCE_FEE_DISPLAY = '$99'

export type LicenceOccupyServiceTier = 'listing' | 'managed'

function formatManagedFeePercent(percent: number): string {
  const n = Number(percent)
  if (!Number.isFinite(n) || n <= 0) return '7%'
  return `${n.toLocaleString('en-AU', { maximumFractionDigits: 2 })}%`
}

/** Clause 11 owner-side fee paragraph - driven by booking service tier. */
export function ownerServiceFeeParagraphForTier(
  tier: LicenceOccupyServiceTier,
  managedFeePercent: number,
  listingFeeDisplay: string = LISTING_TIER_ACCEPTANCE_FEE_DISPLAY,
): string {
  if (tier === 'managed') {
    const pct = formatManagedFeePercent(managedFeePercent)
    return `Quni facilitates payment of the weekly licence fee through the Platform. A Managed service fee of ${pct} of the gross weekly licence fee is deducted from amounts payable to the owner before payout to the owner, as disclosed in the owner service agreement and listing terms.`
  }
  return `The owner has accepted this booking under the Quni Listing service tier. A one-off platform fee of ${listingFeeDisplay} (AUD) is charged to the owner separately when the booking is accepted - it is not deducted from the weekly licence fee. The weekly licence fee is paid directly to the owner by the resident, fee-free.`
}
