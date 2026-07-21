import { isRoomListingProperty } from './listingAccommodationDisplay'
import type { Database } from './database.types'

export type LandlordListingDbStatus = Database['public']['Tables']['properties']['Row']['status']

/** UI status tokens for the grouped listings surface (design-system pills). */
export type LandlordListingUiStatus = 'live' | 'booked' | 'draft' | 'paused' | 'vacant'

export type LandlordListingFilterChip = 'all' | 'live' | 'draft' | 'booked' | 'paused'

export type LandlordListingForGroup = {
  id: string
  title: string
  slug: string
  rent_per_week: number | null
  room_type: string | null
  suburb: string | null
  address: string | null
  images: unknown
  status: LandlordListingDbStatus
  property_type: string | null
  property_group_id: string | null
  bedrooms: number | null
  created_at: string
  service_tier?: string | null
}

const BOOKED_BOOKING_STATUSES = new Set(['confirmed', 'active', 'bond_pending'])

export function listingHasOccupyingBooking(
  listingId: string,
  bookings: Array<{ property_id: string | null; status: string }>,
): boolean {
  return bookings.some(
    (b) => b.property_id === listingId && BOOKED_BOOKING_STATUSES.has(b.status),
  )
}

export function toLandlordListingUiStatus(
  listing: Pick<LandlordListingForGroup, 'id' | 'status'>,
  bookings: Array<{ property_id: string | null; status: string }>,
): LandlordListingUiStatus {
  if (listing.status === 'draft') return 'draft'
  if (listing.status === 'inactive' || listing.status === 'suspended') return 'paused'
  if (listing.status === 'pending') return 'draft'
  if (listing.status === 'active') {
    return listingHasOccupyingBooking(listing.id, bookings) ? 'booked' : 'live'
  }
  return 'paused'
}

export function landlordListingUiStatusLabel(status: LandlordListingUiStatus): string {
  if (status === 'live') return 'Live'
  if (status === 'booked') return 'Booked'
  if (status === 'draft') return 'Draft'
  if (status === 'paused') return 'Paused'
  return 'Vacant'
}

export function landlordListingUiStatusPillClass(status: LandlordListingUiStatus): string {
  const base =
    'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none'
  if (status === 'live') return `${base} bg-[var(--quni-success-bg)] text-[var(--quni-success-strong)]`
  if (status === 'booked') return `${base} bg-[rgba(31,42,68,0.08)] text-[var(--quni-navy)]`
  return `${base} bg-[#F4F3EC] text-[var(--quni-ink-4)]`
}

export function landlordListingRollupChipClass(status: LandlordListingUiStatus): string {
  const base =
    'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none'
  if (status === 'live') return `${base} bg-[var(--quni-success-bg)] text-[var(--quni-success-strong)]`
  if (status === 'booked') return `${base} bg-[rgba(31,42,68,0.08)] text-[var(--quni-navy)]`
  return `${base} bg-[#F4F3EC] text-[var(--quni-ink-4)]`
}

function normalizeAddressKey(address: string | null | undefined, suburb: string | null | undefined): string | null {
  const a = (address ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  const s = (suburb ?? '').trim().toLowerCase()
  if (!a && !s) return null
  return `${a}|${s}`
}

export function landlordListingGroupKey(listing: LandlordListingForGroup): string {
  if (listing.property_group_id) return `group:${listing.property_group_id}`
  const addr = normalizeAddressKey(listing.address, listing.suburb)
  if (addr) return `addr:${addr}`
  return `solo:${listing.id}`
}

export type LandlordListingRollupCounts = Partial<Record<LandlordListingUiStatus, number>>

export type LandlordPropertyGroup = {
  key: string
  kind: 'rooms' | 'whole_place'
  addressLabel: string
  suburb: string | null
  listings: LandlordListingForGroup[]
  /** Display rows after filter (rooms or the single whole-place unit). */
  visibleListings: LandlordListingForGroup[]
  rollup: LandlordListingRollupCounts
  roomCountLabel: string
  thumbnailListing: LandlordListingForGroup
}

function listingAddressLabel(listing: LandlordListingForGroup): string {
  const addr = listing.address?.trim()
  if (addr) return addr
  return listing.title?.trim() || 'Property'
}

function roomDisplayName(listing: LandlordListingForGroup, index: number): string {
  const title = listing.title?.trim()
  if (title && title !== listing.address?.trim()) return title
  return `Room ${index + 1}`
}

export function landlordRoomDisplayName(listing: LandlordListingForGroup, indexInGroup: number): string {
  return roomDisplayName(listing, indexInGroup)
}

function computeRollup(
  listings: LandlordListingForGroup[],
  bookings: Array<{ property_id: string | null; status: string }>,
  vacantSlots: number,
): LandlordListingRollupCounts {
  const rollup: LandlordListingRollupCounts = {}
  for (const listing of listings) {
    const status = toLandlordListingUiStatus(listing, bookings)
    rollup[status] = (rollup[status] ?? 0) + 1
  }
  if (vacantSlots > 0) rollup.vacant = (rollup.vacant ?? 0) + vacantSlots
  return rollup
}

function vacantSlotsForGroup(listings: LandlordListingForGroup[]): number {
  const beds = Math.max(
    0,
    ...listings.map((l) => {
      const n = Math.floor(Number(l.bedrooms))
      return Number.isFinite(n) ? n : 0
    }),
  )
  if (beds <= listings.length) return 0
  return beds - listings.length
}

function isWholePlaceGroup(listings: LandlordListingForGroup[]): boolean {
  if (listings.length !== 1) return false
  return !isRoomListingProperty(listings[0])
}

export function groupLandlordListings(
  listings: LandlordListingForGroup[],
  bookings: Array<{ property_id: string | null; status: string }> = [],
  opts?: {
    search?: string
    statusFilter?: LandlordListingFilterChip
  },
): LandlordPropertyGroup[] {
  const search = (opts?.search ?? '').trim().toLowerCase()
  const statusFilter = opts?.statusFilter ?? 'all'

  const buckets = new Map<string, LandlordListingForGroup[]>()
  for (const listing of listings) {
    const key = landlordListingGroupKey(listing)
    const bucket = buckets.get(key)
    if (bucket) bucket.push(listing)
    else buckets.set(key, [listing])
  }

  const groups: LandlordPropertyGroup[] = []

  for (const [key, bucket] of buckets) {
    const sorted = [...bucket].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    const kind = isWholePlaceGroup(sorted) ? 'whole_place' : 'rooms'
    const vacant = kind === 'rooms' ? vacantSlotsForGroup(sorted) : 0
    const rollup = computeRollup(sorted, bookings, vacant)

    const matchingSearch = (listing: LandlordListingForGroup) => {
      if (!search) return true
      const hay = [listing.title, listing.address, listing.suburb, listing.room_type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(search)
    }

    const matchingStatus = (listing: LandlordListingForGroup) => {
      if (statusFilter === 'all') return true
      return toLandlordListingUiStatus(listing, bookings) === statusFilter
    }

    let visibleListings = sorted.filter((l) => matchingSearch(l) && matchingStatus(l))

    // Property-level search: if address matches, keep all status-matching rooms.
    if (search && visibleListings.length === 0) {
      const propertyMatches = sorted.some((l) => {
        const hay = [l.address, l.suburb, listingAddressLabel(l)].filter(Boolean).join(' ').toLowerCase()
        return hay.includes(search)
      })
      if (propertyMatches) {
        visibleListings = sorted.filter(matchingStatus)
      }
    }

    if (visibleListings.length === 0 && !(statusFilter === 'all' && !search)) {
      // Vacant-only filter: show group if vacant slots exist and filter is not a room status mismatch.
      // Vacant is roll-up only — no chip filter for it.
      continue
    }
    if (visibleListings.length === 0 && (search || statusFilter !== 'all')) continue

    const primary = sorted[0]
    const roomCount = sorted.length
    groups.push({
      key,
      kind,
      addressLabel: listingAddressLabel(primary),
      suburb: primary.suburb,
      listings: sorted,
      visibleListings: statusFilter === 'all' && !search ? sorted : visibleListings.length ? visibleListings : sorted,
      rollup,
      roomCountLabel:
        kind === 'whole_place'
          ? 'Entire place'
          : `${roomCount} ${roomCount === 1 ? 'room' : 'rooms'}`,
      thumbnailListing: primary,
    })
  }

  // When filtering, drop groups with no visible room rows.
  const filtered =
    statusFilter === 'all' && !search
      ? groups
      : groups.filter((g) => g.visibleListings.length > 0)

  return filtered.sort(
    (a, b) =>
      new Date(b.thumbnailListing.created_at).getTime() -
      new Date(a.thumbnailListing.created_at).getTime(),
  )
}

export function countLandlordListingsByUiStatus(
  listings: LandlordListingForGroup[],
  bookings: Array<{ property_id: string | null; status: string }> = [],
): Record<LandlordListingFilterChip, number> {
  const counts: Record<LandlordListingFilterChip, number> = {
    all: listings.length,
    live: 0,
    draft: 0,
    booked: 0,
    paused: 0,
  }
  for (const listing of listings) {
    const status = toLandlordListingUiStatus(listing, bookings)
    if (status === 'live') counts.live += 1
    else if (status === 'draft') counts.draft += 1
    else if (status === 'booked') counts.booked += 1
    else if (status === 'paused') counts.paused += 1
  }
  return counts
}

export const LANDLORD_LISTINGS_EXPANDED_SESSION_KEY = 'quni.landlordListings.expanded'

export function readExpandedListingGroups(): Set<string> {
  try {
    const raw = sessionStorage.getItem(LANDLORD_LISTINGS_EXPANDED_SESSION_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

export function writeExpandedListingGroups(keys: Set<string>): void {
  try {
    sessionStorage.setItem(LANDLORD_LISTINGS_EXPANDED_SESSION_KEY, JSON.stringify([...keys]))
  } catch {
    /* ignore quota / private mode */
  }
}
