import type { ReactNode } from 'react'

type DeskPaperweightProps = {
  children: ReactNode
  className?: string
}

/** Slot 6 — small quiet trust mark / stamp. Omit when vacant. */
export default function DeskPaperweight({ children, className = '' }: DeskPaperweightProps) {
  return (
    <div
      className={[
        'pointer-events-none absolute top-[var(--space-3)] right-[var(--space-3)] inline-flex items-center gap-[var(--space-1)]',
        'rotate-[-5deg] rounded-[var(--radius-sm)] border border-[var(--quni-success)]/45',
        'bg-white/72 px-[var(--space-1)] py-[var(--space-1)] text-quni-micro font-extrabold',
        'text-[var(--quni-success-strong)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
