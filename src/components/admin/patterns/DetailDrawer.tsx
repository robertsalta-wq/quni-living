import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Icon } from '../Icon'
import { Eyebrow } from '../primitives'

export interface DetailDrawerProps {
  open: boolean
  onClose: () => void
  /** Small uppercase eyebrow text — e.g. "Booking · BK-2843". */
  eyebrow: string
  title: string
  /** Optional status node (typically a `<Pill/>`). Rendered below the title. */
  status?: ReactNode
  children: ReactNode
  /** Footer action row — primary + secondary buttons typically. */
  actions?: ReactNode
}

/**
 * Right-rail detail panel for table pages (Bookings primarily; PR 5 may reuse
 * for Pricing change diff).
 *
 * Per HANDOFF §2 / §3: 380px wide, sticky to the top of the page (top: 88px,
 * matching the topbar offset + breathing room). Renders inline beside the
 * table — no portal, no animation. Escape closes. The caller decides
 * `open`/`onClose` from URL state so a refresh restores the same selection.
 */
export function DetailDrawer({
  open,
  onClose,
  eyebrow,
  title,
  status,
  children,
  actions,
}: DetailDrawerProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <aside
      role="dialog"
      aria-label={title}
      className="sticky top-[88px] flex w-[380px] flex-shrink-0 flex-col overflow-hidden rounded-admin-lg border border-admin-line bg-white shadow-admin-card-hover"
      style={{ maxHeight: 'calc(100vh - 110px)' }}
    >
      <header className="flex items-start gap-2 border-b border-admin-line px-5 py-4">
        <div className="flex-1 min-w-0">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h3 className="mt-1 mb-1.5 truncate text-[18px] font-semibold text-admin-ink">{title}</h3>
          {status}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close drawer"
          className="rounded-md p-1 text-admin-ink-4 transition-colors hover:bg-admin-surface-2 hover:text-admin-ink-2"
        >
          <Icon name="x" size={16} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

      {actions ? (
        <footer className="flex gap-2 border-t border-admin-line px-5 py-4">{actions}</footer>
      ) : null}
    </aside>
  )
}
