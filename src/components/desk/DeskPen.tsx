import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

type DeskPenProps = {
  children: ReactNode
  to: string
  /**
   * `coral` — embossing-die CTA (max one per page).
   * `quiet` — outline on navy desks.
   * `ink` — text link on paper/cream desks.
   */
  variant?: 'coral' | 'quiet' | 'ink'
  /** @deprecated Prefer `variant`. Kept so home-v2 can merge cleanly. */
  emphasis?: boolean
  className?: string
  onClick?: () => void
}

/** Slot 4 — one action, phrased as the user's next act. */
export default function DeskPen({
  children,
  to,
  variant,
  emphasis = true,
  className = '',
  onClick,
}: DeskPenProps) {
  const resolved = variant ?? (emphasis ? 'coral' : 'quiet')

  const base =
    'desk-pen inline-flex items-center justify-center gap-1.5 font-bold transition-[transform,box-shadow,background-color,color] duration-[120ms] ease-[var(--ease-standard)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'

  const styles: Record<NonNullable<DeskPenProps['variant']>, string> = {
    coral: [
      'w-full rounded-[var(--radius-md)] px-5 py-2.5 text-[14.5px]',
      'bg-[var(--quni-coral)] text-white',
      'shadow-[0_3px_0_var(--quni-coral-active),0_5px_12px_rgba(0,0,0,0.28)]',
      'hover:bg-[var(--quni-coral-hover)] hover:translate-y-[3px]',
      'hover:shadow-[0_0_0_var(--quni-coral-active),0_1px_3px_rgba(0,0,0,0.32)]',
      'focus-visible:outline-[var(--quni-coral)]',
    ].join(' '),
    quiet: [
      'w-full rounded-[var(--radius-md)] px-5 py-2.5 text-[14.5px]',
      'bg-transparent text-white/90 border border-white/25',
      'hover:bg-white/10',
      'focus-visible:outline-white/60',
    ].join(' '),
    ink: [
      'w-fit self-start rounded-sm pt-2.5 text-[12px] tracking-[0.02em]',
      'text-[var(--quni-ink-2)] no-underline',
      'hover:text-[var(--quni-coral-active)]',
      'focus-visible:outline-[var(--quni-coral)]',
      '[&_.desk-pen-arw]:transition-transform [&_.desk-pen-arw]:duration-200',
      'hover:[&_.desk-pen-arw]:translate-x-0.5',
    ].join(' '),
  }

  return (
    <Link
      to={to}
      onClick={onClick}
      className={[base, styles[resolved], className].filter(Boolean).join(' ')}
    >
      {children}
    </Link>
  )
}
