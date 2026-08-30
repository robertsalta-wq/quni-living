import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

const MENU_WIDTH_PX = 176
const MENU_GAP_PX = 4
const VIEWPORT_PAD_PX = 8
/** Fallback before the portaled panel has measured itself. */
const MENU_HEIGHT_ESTIMATE_PX = 280

type MenuAnchor = { top: number; left: number; maxHeight: number }

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
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null)
  const [shareLabel, setShareLabel] = useState<'Share' | 'Link copied'>('Share')
  const menuId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const shareResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const close = () => {
    setOpen(false)
    setAnchor(null)
  }

  function syncAnchor() {
    const el = buttonRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD_PX
    const spaceAbove = rect.top - VIEWPORT_PAD_PX
    const preferredHeight = panelRef.current?.offsetHeight || MENU_HEIGHT_ESTIMATE_PX
    const openUp = spaceBelow < preferredHeight && spaceAbove > spaceBelow
    const maxHeight = Math.max(120, openUp ? spaceAbove - MENU_GAP_PX : spaceBelow - MENU_GAP_PX)
    const clampedHeight = Math.min(preferredHeight, maxHeight)
    const top = openUp
      ? Math.max(VIEWPORT_PAD_PX, rect.top - MENU_GAP_PX - clampedHeight)
      : rect.bottom + MENU_GAP_PX
    const left = Math.min(
      Math.max(VIEWPORT_PAD_PX, rect.right - MENU_WIDTH_PX),
      window.innerWidth - MENU_WIDTH_PX - VIEWPORT_PAD_PX,
    )
    setAnchor({ top, left, maxHeight })
  }

  function toggle() {
    if (open) {
      close()
      return
    }
    syncAnchor()
    setOpen(true)
  }

  useEffect(() => {
    return () => {
      if (shareResetRef.current) clearTimeout(shareResetRef.current)
    }
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    syncAnchor()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onLayout() {
      syncAnchor()
    }
    window.addEventListener('resize', onLayout)
    window.addEventListener('scroll', onLayout, true)
    return () => {
      window.removeEventListener('resize', onLayout)
      window.removeEventListener('scroll', onLayout, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent) {
      const t = e.target as Node
      if (buttonRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      close()
    }
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', onPointer)
    }, 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('mousedown', onPointer)
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

  const menu =
    open && anchor
      ? createPortal(
          <div
            ref={panelRef}
            id={menuId}
            role="menu"
            className="fixed z-[200] overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--quni-line)] bg-white py-1 shadow-[var(--shadow-3)]"
            style={{
              top: anchor.top,
              left: anchor.left,
              width: MENU_WIDTH_PX,
              maxHeight: anchor.maxHeight,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                close()
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
                  close()
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
                  close()
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
                  close()
                  onPublish?.()
                }}
              >
                Preview
              </button>
            ) : null}
            {canPause && onTogglePause ? (
              <button
                type="button"
                role="menuitem"
                className={itemClass}
                onClick={() => {
                  close()
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
                close()
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
                  close()
                  onDeleteDraft()
                }}
              >
                Delete
              </button>
            ) : null}
          </div>,
          document.body,
        )
      : null

  return (
    <div className="relative z-[2] shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          toggle()
        }}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--quni-ink-4)] hover:bg-[var(--quni-surface-3)] disabled:opacity-50"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {menu}
    </div>
  )
}
