import { Building2, ChevronDown, ChevronUp, Home, Plus } from 'lucide-react'
import {
  landlordListingRollupChipClass,
  landlordListingUiStatusLabel,
  landlordRoomDisplayName,
  toLandlordListingUiStatus,
  type LandlordListingForGroup,
  type LandlordListingUiStatus,
  type LandlordPropertyGroup,
} from '../../../lib/landlordListingsGrouped'
import LandlordListingRoomRow from './LandlordListingRoomRow'
import LandlordListingStatusPill from './LandlordListingStatusPill'

function formatWeeklyRent(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '— /wk'
  return `$${Number(n).toLocaleString('en-AU', { maximumFractionDigits: 0 })} /wk`
}

const ROLLUP_ORDER: LandlordListingUiStatus[] = ['live', 'booked', 'draft', 'paused', 'vacant']

type Actions = {
  onEdit: (listing: LandlordListingForGroup) => void
  onDuplicate: (listing: LandlordListingForGroup) => void
  onTogglePause: (listing: LandlordListingForGroup) => void
  onPublish: (listing: LandlordListingForGroup) => void
  onDeleteDraft?: (listing: LandlordListingForGroup) => void
  onInviteTenant?: (listing: LandlordListingForGroup) => void
  onAddRoom: (group: LandlordPropertyGroup) => void
  busyListingId?: string | null
}

type GroupCardProps = Actions & {
  group: LandlordPropertyGroup
  expanded: boolean
  onToggleExpanded: () => void
  bookings: Array<{ property_id: string | null; status: string }>
}

function PropertyBuildingIcon() {
  return (
    <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--quni-surface-3)]">
      <Building2 className="h-5 w-5 text-[#B8B2BE]" aria-hidden />
    </div>
  )
}

function WholePlaceHouseIcon() {
  return (
    <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--quni-surface-3)]">
      <Home className="h-5 w-5 text-[#B8B2BE]" aria-hidden />
    </div>
  )
}

export function LandlordWholePlaceListingCard({
  group,
  bookings,
  onEdit,
}: Pick<GroupCardProps, 'group' | 'bookings' | 'onEdit'>) {
  const listing = group.listings[0]
  const uiStatus = toLandlordListingUiStatus(listing, bookings)
  const suburbLine = [group.suburb?.trim(), 'Entire place', formatWeeklyRent(listing.rent_per_week)]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className="quni-dashboard-panel">
      <button
        type="button"
        onClick={() => onEdit(listing)}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-[#FBFAF7]"
      >
        <WholePlaceHouseIcon />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-bold text-[var(--quni-ink)]">{group.addressLabel}</p>
          <p className="mt-0.5 truncate text-[12px] text-[var(--quni-ink-4)]">{suburbLine}</p>
        </div>
        <LandlordListingStatusPill status={uiStatus} />
      </button>
    </article>
  )
}

export default function LandlordPropertyGroupCard({
  group,
  expanded,
  onToggleExpanded,
  bookings,
  onEdit,
  onDuplicate,
  onTogglePause,
  onDeleteDraft,
  onAddRoom,
  busyListingId,
}: GroupCardProps) {
  if (group.kind === 'whole_place') {
    return <LandlordWholePlaceListingCard group={group} bookings={bookings} onEdit={onEdit} />
  }

  const suburbLine = [group.suburb?.trim(), group.roomCountLabel].filter(Boolean).join(' · ')

  return (
    <article className="quni-dashboard-panel">
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 p-4 text-left hover:bg-[#FBFAF7]"
      >
        <PropertyBuildingIcon />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-bold text-[var(--quni-ink)]">{group.addressLabel}</p>
          <p className="mt-0.5 truncate text-[12px] text-[var(--quni-ink-4)]">{suburbLine}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ROLLUP_ORDER.map((status) => {
              const count = group.rollup[status] ?? 0
              if (count <= 0) return null
              return (
                <span key={status} className={landlordListingRollupChipClass(status)}>
                  {count} {landlordListingUiStatusLabel(status).toLowerCase()}
                </span>
              )
            })}
          </div>
        </div>
        <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center text-[var(--quni-ink-4)]">
          {expanded ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-[#F0EFEA] bg-[#FBFAF7]">
            {group.visibleListings.map((listing) => {
              const index = group.listings.findIndex((l) => l.id === listing.id)
              const uiStatus = toLandlordListingUiStatus(listing, bookings)
              return (
                <div key={listing.id} className="border-b border-[#F0EFEA] last:border-b-0">
                  <LandlordListingRoomRow
                    listing={listing}
                    roomName={landlordRoomDisplayName(listing, index >= 0 ? index : 0)}
                    uiStatus={uiStatus}
                    weeklyRentLabel={formatWeeklyRent(listing.rent_per_week)}
                    busy={busyListingId === listing.id}
                    onOpenDetail={() => onEdit(listing)}
                    onEdit={() => onEdit(listing)}
                    onDuplicate={() => onDuplicate(listing)}
                    onTogglePause={
                      listing.status === 'active' || listing.status === 'inactive'
                        ? () => onTogglePause(listing)
                        : undefined
                    }
                    onDeleteDraft={
                      listing.status === 'draft' && onDeleteDraft
                        ? () => onDeleteDraft(listing)
                        : undefined
                    }
                  />
                </div>
              )
            })}
            <div className="px-4 py-3 pl-6">
              <button
                type="button"
                onClick={() => onAddRoom(group)}
                className="inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-semibold text-[var(--quni-coral)] hover:underline underline-offset-2"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add room
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
