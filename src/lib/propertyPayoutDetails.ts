export type PropertyPayoutDetailsInput = {
  account_name?: string | null
  bsb?: string | null
  account_number?: string | null
  bank_name?: string | null
}

export type PropertyPayoutDetailsFieldErrorOpts = {
  /** Empty-everything is an error. Default: empty-everything returns []. */
  requireComplete?: boolean
  /** Bank name required. QLD rooming Item 11 only. */
  requireBankName?: boolean
}

/**
 * Listing tier: bond and rent are paid off-platform to the host's nominated account.
 * Every Listing property needs `property_payout_details` - not only boarder/lodger (occupancy) types.
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

/** QLD rooming Item 11 also needs the bank name. Other states do not. */
export function propertyPayoutDetailsQldRoomingComplete(
  p: PropertyPayoutDetailsInput | null | undefined,
): boolean {
  return propertyPayoutDetailsComplete(p) && Boolean(p?.bank_name?.trim())
}

export function propertyPayoutDetailsQldRoomingSaveError(
  p: PropertyPayoutDetailsInput,
): string | null {
  const errs = propertyPayoutDetailsFieldErrors(p, { requireComplete: true, requireBankName: true })
  return errs[0] ?? null
}

export function isMissingPropertyPayoutBankNameColumn(
  error: { message?: string } | null | undefined,
): boolean {
  const msg = (error?.message ?? '').toLowerCase()
  if (!(msg.includes('does not exist') || msg.includes('schema cache'))) return false
  return msg.includes('bank_name')
}

// Returns messages only for fields that are filled-but-invalid, or partial completion.
// Empty-everything returns [] unless requireComplete / requireBankName.
export function propertyPayoutDetailsFieldErrors(
  p: PropertyPayoutDetailsInput,
  opts?: PropertyPayoutDetailsFieldErrorOpts,
): string[] {
  const name = p.account_name?.trim() ?? ''
  const bsb = (p.bsb ?? '').replace(/[\s-]/g, '')
  const acct = (p.account_number ?? '').trim()
  const bank = p.bank_name?.trim() ?? ''
  const anyFilled = Boolean(name || bsb || acct || bank)
  if (!anyFilled && !opts?.requireComplete && !opts?.requireBankName) return []
  const errs: string[] = []
  if (opts?.requireBankName && !bank) errs.push('Bank name is required.')
  if (!name) errs.push('Account name is required.')
  if (!/^\d{6}$/.test(bsb)) errs.push('BSB must be 6 digits.')
  if (!/^\d{5,10}$/.test(acct)) errs.push('Account number must be 5 to 10 digits.')
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
