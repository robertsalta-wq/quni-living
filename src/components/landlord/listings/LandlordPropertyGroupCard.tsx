import { ChevronRight, Home, Plus } from 'lucide-react'
import {
  landlordRoomDisplayName,
  toLandlordListingUiStatus,
  type LandlordListingForGroup,
  type LandlordPropertyGroup,
} from '../../../lib/landlordListingsGrouped'
import LandlordListingOverflowMenu from './LandlordListingOverflowMenu'
import LandlordListingRoomRow from './LandlordListingRoomRow'
import LandlordListingStatusPill from './LandlordListingStatusPill'

function formatWeeklyRent(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '- /wk'
  return `$${Number(n).toLocaleString('en-AU', { maximumFractionDigits: 0 })} /wk`
}

type Actions = {
  onEdit: (listing: LandlordListingForGroup) => void
  onDuplicate: (listing: LandlordListingForGroup) => void
  onTogglePause: (listing: LandlordListingForGroup) => void
  onPublish: (listing: LandlordListingForGroup) => void
  onDeleteDraft?: (listing: LandlordListingForGroup) => void
  onInviteTenant?: (listing: LandlordListingForGroup) => void
  onView: (listing: LandlordListingForGroup) => void
  onAddRoom: (group: LandlordPropertyGroup) => void
  busyListingId?: string | null
}

type GroupCardProps = Actions & {
  group: LandlordPropertyGroup
  expanded: boolean
  onToggleExpanded: () => void
  bookings: Array<{ property_id: string | null; status: string }>
}

function WholePlaceHouseIcon() {
  return (
    <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--quni-surface-3)]">
      <Home className="h-5 w-5 text-[#B8B2BE]" aria-hidden />
    </div>
  )
}

function roomsHeaderSubline(group: LandlordPropertyGroup): string {
  const booked = group.rollup.booked ?? 0
  return [group.suburb?.trim(), group.roomCountLabel, `${booked} booked`].filter(Boolean).join(' · ')
}

function listingRowActions(
  listing: LandlordListingForGroup,
  actions: Pick<
    Actions,
    'onEdit' | 'onDuplicate' | 'onTogglePause' | 'onPublish' | 'onDeleteDraft' | 'onInviteTenant' | 'onView'
  >,
) {
  return {
    onEdit: () => actions.onEdit(listing),
    onDuplicate: () => actions.onDuplicate(listing),
    onTogglePause:
      listing.status === 'active' || listing.status === 'inactive'
        ? () => actions.onTogglePause(listing)
        : undefined,
    onPublish: listing.status === 'draft' ? () => actions.onPublish(listing) : undefined,
    onDeleteDraft:
      listing.status === 'draft' && actions.onDeleteDraft
        ? () => actions.onDeleteDraft?.(listing)
        : undefined,
    onInviteTenant: actions.onInviteTenant ? () => actions.onInviteTenant?.(listing) : undefined,
    onView: listing.status !== 'draft' ? () => actions.onView(listing) : undefined,
  }
}

export function LandlordWholePlaceListingCard({
  group,
  bookings,
  busyListingId,
  onEdit,
  onDuplicate,
  onTogglePause,
  onPublish,
  onDeleteDraft,
  onInviteTenant,
  onView,
}: Pick<
  GroupCardProps,
  | 'group'
  | 'bookings'
  | 'busyListingId'
  | 'onEdit'
  | 'onDuplicate'
  | 'onTogglePause'
  | 'onPublish'
  | 'onDeleteDraft'
  | 'onInviteTenant'
  | 'onView'
>) {
  const listing = group.listings[0]
  const uiStatus = toLandlordListingUiStatus(listing, bookings)
  const suburbLine = [group.suburb?.trim(), 'Entire place', formatWeeklyRent(listing.rent_per_week)]
    .filter(Boolean)
    .join(' · ')
  const rowActions = listingRowActions(listing, {
    onEdit,
    onDuplicate,
    onTogglePause,
    onPublish,
    onDeleteDraft,
    onInviteTenant,
    onView,
  })

  return (
    <article className="quni-card overflow-hidden">
      <div className="relative flex w-full items-center gap-3 p-4">
        <button
          type="button"
          onClick={() => onEdit(listing)}
          className="absolute inset-0 z-0 text-left hover:bg-[var(--quni-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--quni-coral)]"
          aria-label={`Edit ${group.addressLabel}`}
        />
        <div className="relative z-[1] pointer-events-none flex min-w-0 flex-1 items-center gap-3">
          <WholePlaceHouseIcon />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-[var(--quni-ink)] min-[840px]:text-[17px]">
              {group.addressLabel}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-[var(--quni-ink-4)]">{suburbLine}</p>
          </div>
          <LandlordListingStatusPill status={uiStatus} />
        </div>
        <LandlordListingOverflowMenu
          listing={listing}
          busy={busyListingId === listing.id}
          ariaLabel={`Actions for ${group.addressLabel}`}
          {...rowActions}
        />
      </div>
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
  onPublish,
  onDeleteDraft,
  onInviteTenant,
  onView,
  onAddRoom,
  busyListingId,
}: GroupCardProps) {
  if (group.kind === 'whole_place') {
    return (
      <LandlordWholePlaceListingCard
        group={group}
        bookings={bookings}
        busyListingId={busyListingId}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onTogglePause={onTogglePause}
        onPublish={onPublish}
        onDeleteDraft={onDeleteDraft}
        onInviteTenant={onInviteTenant}
        onView={onView}
      />
    )
  }

  const suburbLine = roomsHeaderSubline(group)

  return (
    <article className="quni-card overflow-hidden">
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-[var(--quni-surface-2)]"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-[var(--quni-ink)] min-[840px]:text-[17px]">
            {group.addressLabel}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-[var(--quni-ink-4)]">{suburbLine}</p>
        </div>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[var(--quni-ink-4)]">
          <ChevronRight
            className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            aria-hidden
          />
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-[var(--quni-line-soft)]">
            {group.visibleListings.map((listing) => {
              const index = group.listings.findIndex((l) => l.id === listing.id)
              const uiStatus = toLandlordListingUiStatus(listing, bookings)
              const rowActions = listingRowActions(listing, {
                onEdit,
                onDuplicate,
                onTogglePause,
                onPublish,
                onDeleteDraft,
                onInviteTenant,
                onView,
              })
              return (
                <LandlordListingRoomRow
                  key={listing.id}
                  listing={listing}
                  roomName={landlordRoomDisplayName(listing, index >= 0 ? index : 0)}
                  uiStatus={uiStatus}
                  weeklyRentLabel={formatWeeklyRent(listing.rent_per_week)}
                  busy={busyListingId === listing.id}
                  onOpenDetail={() => onEdit(listing)}
                  {...rowActions}
                />
              )
            })}
            <div className="px-4 py-3 pl-4 min-[840px]:pl-6">
              <button
                type="button"
                onClick={() => onAddRoom(group)}
                className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold text-[var(--quni-coral)] hover:underline underline-offset-2"
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
