import type { ReactNode } from 'react'

type DeskPaperweightProps = {
  children: ReactNode
  className?: string
}

/** Slot 6 — small quiet trust mark. Omit when vacant. */
export default function DeskPaperweight({ children, className = '' }: DeskPaperweightProps) {
  return (
    <div
      className={['text-[11px] leading-snug text-white/55', className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  )
}
