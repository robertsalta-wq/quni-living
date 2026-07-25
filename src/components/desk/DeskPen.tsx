import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

type DeskPenProps = {
  children: ReactNode
  to: string
  /** Coral reserved for the page's two most important actions. */
  emphasis?: boolean
  className?: string
  onClick?: () => void
}

/** Slot 4 — one action, phrased as the user's next act. Embossing-die press on hover. */
export default function DeskPen({
  children,
  to,
  emphasis = true,
  className = '',
  onClick,
}: DeskPenProps) {
  const base =
    'desk-pen inline-flex w-full items-center justify-center rounded-[var(--radius-md)] px-5 py-2.5 text-[14.5px] font-bold transition-[transform,box-shadow,background-color] duration-[120ms] ease-[var(--ease-standard)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'

  const coral = [
    'bg-[var(--quni-coral)] text-white',
    'shadow-[0_3px_0_var(--quni-coral-active),0_5px_12px_rgba(0,0,0,0.28)]',
    'hover:bg-[var(--quni-coral-hover)] hover:translate-y-[3px]',
    'hover:shadow-[0_0_0_var(--quni-coral-active),0_1px_3px_rgba(0,0,0,0.32)]',
    'focus-visible:outline-[var(--quni-coral)]',
  ].join(' ')

  const quiet = [
    'bg-transparent text-white/90 border border-white/25',
    'hover:bg-white/10',
    'focus-visible:outline-white/60',
  ].join(' ')

  return (
    <Link
      to={to}
      onClick={onClick}
      className={[base, emphasis ? coral : quiet, className].filter(Boolean).join(' ')}
    >
      {children}
    </Link>
  )
}
