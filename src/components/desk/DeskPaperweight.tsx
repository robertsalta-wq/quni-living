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
        'pointer-events-none absolute top-3 right-3.5 inline-flex items-center gap-1',
        'rotate-[-5deg] rounded-[4px] border-[1.3px] border-[var(--quni-success)]/45',
        'bg-white/72 px-1.5 py-0.5 text-[7.5px] font-extrabold tracking-[0.1em]',
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
