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
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
        className={[
          'inline-flex w-fit items-center gap-2 rounded-[var(--radius-pill)] border border-white/18',
          'bg-white/[0.06] px-3.5 py-2 text-left text-[12px] font-semibold text-white/72',
          'transition-colors duration-[var(--dur-base)] ease-[var(--ease-standard)]',
          'hover:bg-white/12 group-hover:bg-white/12',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral-on-navy)]',
          controlClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span
          aria-hidden
          className="text-[14px] leading-none text-[var(--quni-coral-on-navy)] opacity-80 transition-opacity duration-[var(--dur-base)] group-hover:opacity-100"
        >
          {open ? '⊖' : '⊕'}
        </span>
        <span>{label}</span>
      </button>

      <div
        id={panelId}
        hidden={!open}
        className={[
          'desk-drawer-panel overflow-hidden',
          open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1.5',
          'transition-[opacity,transform] duration-[320ms] ease-[var(--ease-standard)]',
          panelClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {open ? children : null}
      </div>
    </div>
  )
}
