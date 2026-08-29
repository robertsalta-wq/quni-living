import { firstPropertyImageUrl } from '../../../lib/propertyImages'
import type { LandlordListingForGroup, LandlordListingUiStatus } from '../../../lib/landlordListingsGrouped'
import LandlordListingOverflowMenu from './LandlordListingOverflowMenu'
import LandlordListingReviewButton from './LandlordListingReviewButton'
import LandlordListingStatusPill from './LandlordListingStatusPill'

type Props = {
  listing: LandlordListingForGroup
  roomName: string
  uiStatus: LandlordListingUiStatus
  weeklyRentLabel: string
  busy?: boolean
  onOpenDetail: () => void
  onEdit: () => void
  onDuplicate: () => void
  onTogglePause?: () => void
  onDeleteDraft?: () => void
  onPublish?: () => void
  onInviteTenant?: () => void
  onView?: () => void
}

function roomTypeLabel(listing: LandlordListingForGroup): string | null {
  const t = listing.room_type?.trim()
  return t || null
}

function RoomThumb({ listing }: { listing: LandlordListingForGroup }) {
  const images = Array.isArray(listing.images)
    ? listing.images.filter((x): x is string => typeof x === 'string')
    : null
  const image = firstPropertyImageUrl(images)
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-[#EDEAE2] min-[840px]:h-[52px] min-[840px]:w-[52px]">
      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
    </div>
  )
}

export default function LandlordListingRoomRow({
  listing,
  roomName,
  uiStatus,
  weeklyRentLabel,
  busy,
  onOpenDetail,
  onEdit,
  onDuplicate,
  onTogglePause,
  onDeleteDraft,
  onPublish,
  onInviteTenant,
  onView,
}: Props) {
  const typeLine = roomTypeLabel(listing)

  return (
    <div className="relative border-b border-[var(--quni-line-soft)] last:border-b-0">
      <div className="relative flex items-center gap-3 py-3 pl-4 pr-4 min-[840px]:pl-6">
        <button
          type="button"
          onClick={onOpenDetail}
          className="absolute inset-0 z-0 rounded-none text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--quni-coral)]"
          aria-label={`Open ${roomName}`}
        />
        <div className="relative z-[1] pointer-events-none flex min-w-0 flex-1 items-center gap-3">
          <RoomThumb listing={listing} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[var(--quni-ink)]">{roomName}</p>
            {/* Mobile: rent under name. Desktop: type under name; rent in its own column. */}
            <p className="mt-0.5 truncate text-[11.5px] text-[var(--quni-ink-4)] min-[840px]:hidden tabular-nums">
              {weeklyRentLabel}
            </p>
            {typeLine ? (
              <p className="mt-0.5 hidden truncate text-[11.5px] text-[var(--quni-ink-4)] min-[840px]:block">
                {typeLine}
              </p>
            ) : null}
          </div>
          <p className="hidden shrink-0 text-right text-[13px] font-semibold tabular-nums text-[var(--quni-ink)] min-[840px]:block min-[840px]:w-[5.5rem]">
            {weeklyRentLabel}
          </p>
          <div className="shrink-0 min-[840px]:w-[4.75rem] min-[840px]:flex min-[840px]:justify-end">
            <LandlordListingStatusPill status={uiStatus} />
          </div>
        </div>
        {listing.status === 'draft' ? (
          <LandlordListingReviewButton onClick={onOpenDetail} />
        ) : null}
        <LandlordListingOverflowMenu
          listing={listing}
          busy={busy}
          ariaLabel={`Actions for ${roomName}`}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onTogglePause={onTogglePause}
          onDeleteDraft={onDeleteDraft}
          onPublish={onPublish}
          onInviteTenant={onInviteTenant}
          onView={onView}
        />
      </div>
    </div>
  )
}
