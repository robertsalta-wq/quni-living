export type PropertyPayoutDetailsInput = {
  account_name?: string | null
  bsb?: string | null
  account_number?: string | null
}

/**
 * Listing tier: bond and rent are paid off-platform to the host's nominated account.
 * Every Listing property needs `property_payout_details` — not only boarder/lodger (occupancy) types.
 * Managed uses Stripe Connect instead.
 */
export function listingTierRequiresPropertyPayoutDetails(
  serviceTier: string | null | undefined,
): boolean {
  return serviceTier === 'listing'
}

export function propertyPayoutDetailsComplete(p: PropertyPayoutDetailsInput | null | undefined): boolean {
  return Boolean(p?.account_name?.trim() && p?.bsb?.trim() && p?.account_number?.trim())
}

// Returns messages only for fields that are filled-but-invalid, or partial completion.
// Empty-everything returns [] (not a publish blocker this chunk).
export function propertyPayoutDetailsFieldErrors(p: PropertyPayoutDetailsInput): string[] {
  const name = p.account_name?.trim() ?? ''
  const bsb = (p.bsb ?? '').replace(/[\s-]/g, '')
  const acct = (p.account_number ?? '').trim()
  const anyFilled = Boolean(name || bsb || acct)
  if (!anyFilled) return []
  const errs: string[] = []
  if (!name) errs.push('Account name is required.')
  if (!/^\d{6}$/.test(bsb)) errs.push('BSB must be 6 digits.')
  if (!/^\d{5,10}$/.test(acct)) errs.push('Account number must be 5–10 digits.')
  return errs
}

export function formatPropertyPayoutBsbDisplay(raw: string): string {
  const digits = (raw ?? '').replace(/[\s-]/g, '')
  if (digits.length !== 6) return raw.trim()
  return `${digits.slice(0, 3)}-${digits.slice(3)}`
}

export function normalizePropertyPayoutEmbed(
  raw: PropertyPayoutDetailsInput | PropertyPayoutDetailsInput[] | null | undefined,
): PropertyPayoutDetailsInput | null {
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}
