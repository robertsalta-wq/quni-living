/**
 * Queensland on-site boarder/lodger (T1) — RTRA Act 2008 framing for listings and licence PDFs.
 */

export const QLD_RTRA_ACT_SHORT = 'Residential Tenancies and Rooming Accommodation Act 2008 (Qld)'

/** s 43 — owner-occupied premises with at most this many rooms for residents. */
export const QLD_SECTION_43_MAX_ROOMS_FOR_RESIDENTS = 3

export function isQldOnSiteBoarderLodgerListing(
  state: string | null | undefined,
  propertyType: string | null | undefined,
): boolean {
  const st = typeof state === 'string' ? state.trim().toUpperCase() : ''
  const pt = typeof propertyType === 'string' ? propertyType.trim() : ''
  return st === 'QLD' && pt === 'private_room_landlord_on_site'
}

export function parseRoomsRentedToResidents(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw, 10) : NaN
  if (!Number.isFinite(n) || n < 1) return null
  return Math.min(99, Math.floor(n))
}

export function qldRoomsRentedFieldError(rooms: number | null): string | null {
  if (rooms == null) {
    return 'Enter how many rooms you rent to residents in this home (including this listing).'
  }
  if (rooms > QLD_SECTION_43_MAX_ROOMS_FOR_RESIDENTS) {
    return `Queensland boarder/lodger arrangements where the owner lives on site usually rely on the s 43 exemption (no more than ${QLD_SECTION_43_MAX_ROOMS_FOR_RESIDENTS} rooms for residents). With more than ${QLD_SECTION_43_MAX_ROOMS_FOR_RESIDENTS} rooms, the arrangement may be rooming accommodation under the ${QLD_RTRA_ACT_SHORT} — use a registered rooming house listing or seek legal advice.`
  }
  return null
}

export function qldOnSiteListingCallout(): string {
  return (
    `This listing is a room in your home in Queensland (boarder/lodger style). The ${QLD_RTRA_ACT_SHORT} ` +
    `generally does not apply to boarders and lodgers (s 27), but bond must still be lodged with RTA Queensland within 10 days. ` +
    `If you live on site and rent out no more than ${QLD_SECTION_43_MAX_ROOMS_FOR_RESIDENTS} rooms to residents, the rooming accommodation provisions (including Form R18) ` +
    `usually do not apply (s 43).`
  )
}

export function qldSection43ScheduleLine(rooms: number): string {
  return `${rooms} room${rooms === 1 ? '' : 's'} (landlord declaration for s 43)`
}

export function qldSection43PdfAcknowledgement(rooms: number): string {
  return (
    `The owner declares that they reside on the premises and that ${rooms} room${rooms === 1 ? '' : 's'} ` +
    `(including the allocated room) are occupied or available for occupation by residents, and that the parties rely on the ` +
    `owner-occupied small-scale arrangement under s 43 of the ${QLD_RTRA_ACT_SHORT} (not rooming accommodation under Form R18).`
  )
}
