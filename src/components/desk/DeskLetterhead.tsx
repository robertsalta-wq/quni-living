import type { ReactNode } from 'react'

type DeskLetterheadProps = {
  children: ReactNode
  className?: string
}

/** Slot 2 — one serif line stating the offer. Type from `--text-h4` tokens. */
export default function DeskLetterhead({ children, className = '' }: DeskLetterheadProps) {
  return (
    <p
      className={[
        'max-w-[min(100%,24rem)] font-display text-quni-h4 font-normal text-white text-pretty',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </p>
  )
}
