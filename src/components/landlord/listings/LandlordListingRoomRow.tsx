import { useEffect, useId, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { firstPropertyImageUrl } from '../../../lib/propertyImages'
import type { LandlordListingForGroup, LandlordListingUiStatus } from '../../../lib/landlordListingsGrouped'
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
}: Props) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const typeLine = roomTypeLabel(listing)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const canPause = listing.status === 'active' || listing.status === 'inactive'
  const pauseLabel = listing.status === 'active' ? 'Pause' : 'Unpause'

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
        <div className="relative z-[2] shrink-0" ref={rootRef}>
          <button
            type="button"
            aria-label={`Actions for ${roomName}`}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              setOpen((v) => !v)
            }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--quni-ink-4)] hover:bg-[var(--quni-surface-3)] disabled:opacity-50"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </button>
          {open ? (
            <div
              id={menuId}
              role="menu"
              className="absolute right-0 z-20 mt-1 min-w-[10.5rem] overflow-hidden rounded-xl border border-[var(--quni-line)] bg-white py-1 shadow-md"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2.5 text-left text-[13px] font-medium text-[var(--quni-ink)] hover:bg-[var(--quni-surface-2)]"
                onClick={() => {
                  setOpen(false)
                  onEdit()
                }}
              >
                Edit
              </button>
              {canPause && onTogglePause ? (
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2.5 text-left text-[13px] font-medium text-[var(--quni-ink)] hover:bg-[var(--quni-surface-2)]"
                  onClick={() => {
                    setOpen(false)
                    onTogglePause()
                  }}
                >
                  {pauseLabel}
                </button>
              ) : null}
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2.5 text-left text-[13px] font-medium text-[var(--quni-ink)] hover:bg-[var(--quni-surface-2)]"
                onClick={() => {
                  setOpen(false)
                  onDuplicate()
                }}
              >
                Duplicate
              </button>
              {listing.status === 'draft' && onDeleteDraft ? (
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2.5 text-left text-[13px] font-medium text-[var(--quni-danger-strong)] hover:bg-[var(--quni-danger-bg)]"
                  onClick={() => {
                    setOpen(false)
                    onDeleteDraft()
                  }}
                >
                  Delete
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
