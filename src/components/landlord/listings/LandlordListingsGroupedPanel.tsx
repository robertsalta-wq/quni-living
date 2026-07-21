import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import {
  countLandlordListingsByUiStatus,
  groupLandlordListings,
  readExpandedListingGroups,
  writeExpandedListingGroups,
  type LandlordListingFilterChip,
  type LandlordListingForGroup,
  type LandlordPropertyGroup,
} from '../../../lib/landlordListingsGrouped'
import type { LandlordPropertyForListingActions } from '../../../hooks/useLandlordPropertyListingActions'
import LandlordListingsStatusChips from './LandlordListingsStatusChips'
import LandlordPropertyGroupCard from './LandlordPropertyGroupCard'

type Props = {
  listings: LandlordListingForGroup[]
  bookings: Array<{ property_id: string | null; status: string }>
  dataLoading: boolean
  canCreateListing: boolean
  createListingHref: string
  setupHref: string
  setupLabel: string
  publishingListingId: string | null
  duplicatingListingId: string | null
  updatingListingId: string | null
  onPublish: (p: LandlordPropertyForListingActions) => void
  onDuplicateClick: (p: LandlordPropertyForListingActions) => void
  onToggle: (p: LandlordPropertyForListingActions) => void
  onDeleteDraft?: (listing: LandlordListingForGroup) => void
  onInviteTenant?: (listing: LandlordListingForGroup) => void
  toActionListing: (listing: LandlordListingForGroup) => LandlordPropertyForListingActions
}

export default function LandlordListingsGroupedPanel({
  listings,
  bookings,
  dataLoading,
  canCreateListing,
  createListingHref,
  setupHref,
  setupLabel,
  publishingListingId,
  duplicatingListingId,
  updatingListingId,
  onPublish,
  onDuplicateClick,
  onToggle,
  onDeleteDraft,
  onInviteTenant,
  toActionListing,
}: Props) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LandlordListingFilterChip>('all')
  const [expanded, setExpanded] = useState<Set<string>>(() => readExpandedListingGroups())
  const [expandedSeeded, setExpandedSeeded] = useState(false)

  const counts = useMemo(
    () => countLandlordListingsByUiStatus(listings, bookings),
    [listings, bookings],
  )

  const groups = useMemo(
    () => groupLandlordListings(listings, bookings, { search, statusFilter }),
    [listings, bookings, search, statusFilter],
  )

  const filterActive = search.trim().length > 0 || statusFilter !== 'all'

  useEffect(() => {
    if (expandedSeeded || listings.length === 0) return
    const initial = groupLandlordListings(listings, bookings)
    if (initial.length === 0) return
    setExpanded((prev) => {
      if (prev.size > 0) return prev
      const next = new Set([initial[0].key])
      writeExpandedListingGroups(next)
      return next
    })
    setExpandedSeeded(true)
  }, [listings, bookings, expandedSeeded])

  useEffect(() => {
    if (!filterActive) return
    setExpanded((prev) => {
      const next = new Set(prev)
      let changed = false
      for (const g of groups) {
        if (g.kind === 'rooms' && !next.has(g.key)) {
          next.add(g.key)
          changed = true
        }
      }
      if (changed) writeExpandedListingGroups(next)
      return changed ? next : prev
    })
  }, [filterActive, groups])

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      writeExpandedListingGroups(next)
      return next
    })
  }

  const busyListingId = publishingListingId ?? duplicatingListingId ?? updatingListingId

  const addButton = canCreateListing ? (
    <Link
      to={createListingHref}
      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[10px] bg-[var(--quni-coral)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--quni-coral-hover)]"
    >
      <Plus className="h-4 w-4" aria-hidden />
      Add
    </Link>
  ) : (
    <Link
      to={setupHref}
      title={setupLabel}
      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[10px] border-2 border-stone-300 bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
    >
      <Plus className="h-4 w-4" aria-hidden />
      Add
    </Link>
  )

  if (dataLoading && listings.length === 0) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading listings">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-[var(--quni-line)] bg-white" />
        ))}
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--quni-line)] bg-white px-6 py-14 text-center">
        <p className="text-sm text-[var(--quni-ink-4)]">You haven&apos;t listed any properties yet.</p>
        {canCreateListing ? (
          <Link
            to={createListingHref}
            className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-[var(--quni-coral)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--quni-coral-hover)]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add your first listing
          </Link>
        ) : (
          <Link
            to={setupHref}
            className="mt-5 inline-flex items-center justify-center rounded-[10px] border-2 border-stone-300 bg-stone-100 px-5 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            Complete setup to add a listing
          </Link>
        )}
      </div>
    )
  }

  const handleAddRoom = (group: LandlordPropertyGroup) => {
    const source = group.listings[0]
    if (!source) return
    onDuplicateClick(toActionListing(source))
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <div className="sticky top-0 z-10 space-y-3 bg-admin-surface-2/95 py-2 backdrop-blur-sm supports-[backdrop-filter]:bg-admin-surface-2/80">
        <div className="flex items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search address or room</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--quni-ink-5)]"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search address or room"
              className="w-full rounded-[10px] border border-[var(--quni-line)] bg-white py-2.5 pl-9 pr-3 text-sm text-[var(--quni-ink)] placeholder:text-[var(--quni-ink-5)] focus:border-[var(--quni-coral)] focus:outline-none focus:ring-2 focus:ring-[rgba(255,111,97,0.25)]"
            />
          </label>
          {addButton}
        </div>
        <LandlordListingsStatusChips active={statusFilter} counts={counts} onChange={setStatusFilter} />
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-[var(--quni-line)] bg-white px-6 py-10 text-center">
          <p className="text-sm text-[var(--quni-ink-4)]">No listings match this filter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <LandlordPropertyGroupCard
              key={group.key}
              group={group}
              expanded={expanded.has(group.key)}
              onToggleExpanded={() => toggleExpanded(group.key)}
              bookings={bookings}
              busyListingId={busyListingId}
              onEdit={(listing) => navigate(`/landlord/property/edit/${listing.id}`)}
              onDuplicate={(listing) => onDuplicateClick(toActionListing(listing))}
              onTogglePause={(listing) => void onToggle(toActionListing(listing))}
              onPublish={(listing) => void onPublish(toActionListing(listing))}
              onDeleteDraft={onDeleteDraft}
              onInviteTenant={onInviteTenant}
              onAddRoom={handleAddRoom}
            />
          ))}
        </div>
      )}
    </div>
  )
}
