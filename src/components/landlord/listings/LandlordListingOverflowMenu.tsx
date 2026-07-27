import { useEffect, useId, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { shareListing } from '../../../lib/listingShare'
import type { LandlordListingForGroup } from '../../../lib/landlordListingsGrouped'
import { parseLandlordServiceTier } from '../../../lib/landlordServiceTier'

export type LandlordListingOverflowMenuProps = {
  listing: LandlordListingForGroup
  busy?: boolean
  ariaLabel: string
  onEdit: () => void
  onDuplicate: () => void
  onTogglePause?: () => void
  onDeleteDraft?: () => void
  onPublish?: () => void
  onInviteTenant?: () => void
  onView?: () => void
}

const itemClass =
  'block w-full px-3 py-2.5 text-left text-[13px] font-medium text-[var(--quni-ink)] hover:bg-[var(--quni-surface-2)]'
const dangerItemClass =
  'block w-full px-3 py-2.5 text-left text-[13px] font-medium text-[var(--quni-danger-strong)] hover:bg-[var(--quni-danger-bg)]'

export function listingCanInviteTenant(listing: Pick<LandlordListingForGroup, 'status' | 'service_tier'>): boolean {
  return listing.status === 'active' && parseLandlordServiceTier(listing.service_tier) === 'listing'
}

export default function LandlordListingOverflowMenu({
  listing,
  busy,
  ariaLabel,
  onEdit,
  onDuplicate,
  onTogglePause,
  onDeleteDraft,
  onPublish,
  onInviteTenant,
  onView,
}: LandlordListingOverflowMenuProps) {
  const [open, setOpen] = useState(false)
  const [shareLabel, setShareLabel] = useState<'Share' | 'Link copied'>('Share')
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const shareResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (shareResetRef.current) clearTimeout(shareResetRef.current)
    }
  }, [])

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
  const isDraft = listing.status === 'draft'
  const canView = !isDraft && Boolean(listing.slug?.trim()) && Boolean(onView)
  const canShare = !isDraft && Boolean(listing.slug?.trim())
  const canInvite = Boolean(onInviteTenant) && listingCanInviteTenant(listing)
  const canPublish = isDraft && Boolean(onPublish)

  async function handleShare() {
    const result = await shareListing({ slug: listing.slug, title: listing.title })
    if (result === 'copied' || result === 'prompted') {
      setShareLabel('Link copied')
      if (shareResetRef.current) clearTimeout(shareResetRef.current)
      shareResetRef.current = setTimeout(() => setShareLabel('Share'), 2000)
    }
  }

  return (
    <div className="relative z-[2] shrink-0" ref={rootRef}>
      <button
        type="button"
        aria-label={ariaLabel}
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
          className="absolute right-0 z-20 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-[var(--quni-line)] bg-white py-1 shadow-md"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
          >
            {isDraft ? 'Continue' : 'Edit'}
          </button>
          {canView ? (
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                setOpen(false)
                onView?.()
              }}
            >
              View
            </button>
          ) : null}
          {canShare ? (
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                void handleShare()
              }}
            >
              {shareLabel}
            </button>
          ) : null}
          {canInvite ? (
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                setOpen(false)
                onInviteTenant?.()
              }}
            >
              Invite a tenant
            </button>
          ) : null}
          {canPublish ? (
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                setOpen(false)
                onPublish?.()
              }}
            >
              Publish
            </button>
          ) : null}
          {canPause && onTogglePause ? (
            <button
              type="button"
              role="menuitem"
              className={itemClass}
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
            className={itemClass}
            onClick={() => {
              setOpen(false)
              onDuplicate()
            }}
          >
            Duplicate
          </button>
          {isDraft && onDeleteDraft ? (
            <button
              type="button"
              role="menuitem"
              className={dangerItemClass}
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
  )
}
