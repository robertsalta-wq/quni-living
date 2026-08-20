/** Admin concierge listing: create a draft on a landlord's profile. Staff cannot attest. */

export const ADMIN_CONCIERGE_LANDLORD_QUERY = 'landlord'

export const ADMIN_CONCIERGE_DRAFT_NOTE =
  'This listing will save as a draft. The landlord must review it and attest before it can go public.'

export const ADMIN_CONCIERGE_CREATED_MESSAGE =
  'Draft saved. The landlord must review this listing and attest before it can go public.'

export const ADMIN_ACTIVATE_UNATTESTED_MESSAGE =
  'The landlord must attest authority to let before this listing can go live.'

export const ADMIN_ACTIVATE_NSW_T3_MESSAGE =
  'The landlord must complete the NSW boarding-house compliance attestation before this listing can go live.'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const AU_STATES = new Set(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'])

export function parseAdminConciergeLandlordProfileId(value: string | null | undefined): string | null {
  const v = value?.trim() ?? ''
  return UUID_RE.test(v) ? v : null
}

export function adminNewListingPath(landlordProfileId?: string | null): string {
  const id = parseAdminConciergeLandlordProfileId(landlordProfileId)
  if (!id) return '/landlord/property/new'
  return `/landlord/property/new?${ADMIN_CONCIERGE_LANDLORD_QUERY}=${encodeURIComponent(id)}`
}

/** Admin creates are always draft. Landlords keep existing NSW T3 draft-then-attest behaviour. */
export function adminNewListingStatus(
  isAdmin: boolean,
  landlordWouldPublishActive: boolean,
): 'draft' | 'active' {
  if (isAdmin) return 'draft'
  return landlordWouldPublishActive ? 'active' : 'draft'
}

export function skipListingAttestationsForAdmin(isAdmin: boolean): boolean {
  return isAdmin
}

export function listingStateFromLandlordProfile(state: string | null | undefined): string | null {
  const s = (state ?? '').trim().toUpperCase()
  return AU_STATES.has(s) ? s : null
}

export type AdminLandlordOption = {
  id: string
  label: string
  email?: string | null
  state?: string | null
}

export function filterLandlordOptionsForSearch<T extends AdminLandlordOption>(
  options: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return options
  return options.filter((o) => {
    if (o.label.toLowerCase().includes(q)) return true
    if ((o.email ?? '').toLowerCase().includes(q)) return true
    return o.id.toLowerCase() === q
  })
}

/** Sync gate: authority-to-let must exist before staff can set status to active. */
export function adminPropertyActivateBlockedReason(args: {
  nextStatus: string
  authorityToLetAttestedAt: string | null | undefined
}): string | null {
  if (args.nextStatus !== 'active') return null
  if (!args.authorityToLetAttestedAt) return ADMIN_ACTIVATE_UNATTESTED_MESSAGE
  return null
}
