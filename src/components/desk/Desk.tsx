import type { ReactNode } from 'react'

export type DeskTone = 'navy' | 'paper' | 'cream'

type DeskProps = {
  /** Required slot 1 */
  nameplate: ReactNode
  /** Required slot 2 */
  letterhead: ReactNode
  inTray?: ReactNode
  pen?: ReactNode
  drawer?: ReactNode
  paperweight?: ReactNode
  /** Optional content after slots (e.g. wax-seal footnote). */
  foot?: ReactNode
  tone?: DeskTone
  className?: string
  style?: React.CSSProperties
  children?: ReactNode
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

const toneClass: Record<DeskTone, string> = {
  navy: 'bg-[var(--quni-navy)] text-white/78',
  paper: 'bg-[var(--quni-surface-1)] text-[var(--quni-ink-3)]',
  cream: 'bg-[var(--surface-0)] text-[var(--quni-ink-3)]',
}

/**
 * Desk shell — fixed slot order. Slots 1–2 required; 3–6 optional.
 * Hover may lift 2px; never opens anything.
 */
export default function Desk({
  nameplate,
  letterhead,
  inTray,
  pen,
  drawer,
  paperweight,
  foot,
  tone = 'navy',
  className = '',
  style,
  children,
  onMouseEnter,
  onMouseLeave,
}: DeskProps) {
  return (
    <article
      className={[
        'desk-shell desk-settle group flex min-h-0 w-full flex-col gap-2.5 overflow-visible rounded-[var(--radius-lg)] p-4',
        'shadow-[var(--shadow-1)] transition-[transform,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-standard)]',
        'hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)]',
        '[contain:layout_paint]',
        toneClass[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex flex-col gap-2">
        {nameplate}
        {letterhead}
      </div>
      {inTray}
      {pen}
      {drawer}
      {paperweight}
      {foot}
      {children}
    </article>
  )
}
