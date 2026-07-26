import type { ReactNode } from 'react'

type DeskLetterheadProps = {
  children: ReactNode
  className?: string
}

/** Slot 2 — one serif line stating the offer. */
export default function DeskLetterhead({ children, className = '' }: DeskLetterheadProps) {
  return (
    <p
      className={[
        'max-w-[370px] font-display text-[17px] font-normal leading-[1.25] tracking-[-0.02em] text-white text-pretty',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </p>
  )
}
