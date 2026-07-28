import { useId, type ReactNode } from 'react'

type DeskDrawerProps = {
  label: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  /** Brighten ⊕ on desk hover (parent sets data attribute / class). */
  controlClassName?: string
  panelClassName?: string
}

/** Slot 5 — ⊕ expands in place; grows the desk downward. Never overlays. */
export default function DeskDrawer({
  label,
  open,
  onOpenChange,
  children,
  controlClassName = '',
  panelClassName = '',
}: DeskDrawerProps) {
  const panelId = useId()

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
        className={[
          'inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-pill)] border border-white/18',
          'bg-white/[0.06] px-3 py-1.5 text-left text-sm font-semibold text-white',
          'transition-colors duration-[var(--dur-base)] ease-[var(--ease-standard)]',
          'hover:bg-white/12 group-hover:bg-white/12',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral-active)]',
          controlClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span aria-hidden className="text-sm leading-none text-white opacity-80 transition-opacity duration-[var(--dur-base)] group-hover:opacity-100">
          {open ? '⊖' : '⊕'}
        </span>
        <span>{label}</span>
      </button>

      {/* CSS-collapse (Gate 6) — content stays in the DOM; never conditional unmount. */}
      <div
        id={panelId}
        className={[
          'desk-drawer-panel grid transition-[grid-template-rows] duration-[320ms] ease-[var(--ease-standard)]',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          panelClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        data-desk-drawer={open ? 'open' : 'closed'}
      >
        <div className="min-h-0 overflow-hidden">
          <div aria-hidden={!open}>{children}</div>
        </div>
      </div>
    </div>
  )
}
