/** Legal categories for ending a live agreement (labels; only mutual_surrender is fully wired). */
export const TERMINATION_TYPES = [
  'mutual_surrender',
  'tenant_notice',
  'landlord_grounds',
  'breach',
  'end_of_term',
] as const

export type TerminationType = (typeof TERMINATION_TYPES)[number]

export const BOND_OUTCOMES = [
  'pending',
  'transferred',
  'refunded',
  'retained_by_agreement',
  'never_lodged',
  'na',
] as const

export type BondOutcome = (typeof BOND_OUTCOMES)[number]

export const TERMINATION_INITIATORS = ['landlord', 'tenant', 'admin'] as const
export type TerminationInitiator = (typeof TERMINATION_INITIATORS)[number]

/** Statuses that still hold the room / block sibling-group double-hold. */
export const AGREEMENT_HOLDING_STATUSES = [
  'bond_pending',
  'confirmed',
  'active',
  'terminating',
] as const

export function isTerminationType(v: unknown): v is TerminationType {
  return typeof v === 'string' && (TERMINATION_TYPES as readonly string[]).includes(v)
}

export function isBondOutcome(v: unknown): v is BondOutcome {
  return typeof v === 'string' && (BOND_OUTCOMES as readonly string[]).includes(v)
}

/** YYYY-MM-DD calendar date (UTC noon compare for “effective date reached”). */
export function parseIsoDateOnly(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null
  return t
}

export function effectiveDateReached(effectiveDate: string, now: Date = new Date()): boolean {
  const today = now.toISOString().slice(0, 10)
  return effectiveDate <= today
}

/** Legal Tier 2 (RTA) listing property types. */
export function isLegalTier2PropertyType(propertyType: string | null | undefined): boolean {
  const t = (propertyType ?? '').trim()
  return (
    t === 'private_room_landlord_off_site' ||
    t === 'entire_property' ||
    t === 'shared_room'
  )
}

export function isLegalTier1PropertyType(propertyType: string | null | undefined): boolean {
  return (propertyType ?? '').trim() === 'private_room_landlord_on_site'
}
