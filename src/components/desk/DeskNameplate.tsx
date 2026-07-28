import type { DeskNameplateVariant } from '../../lib/deskNameplateVariants'

export type { DeskNameplateVariant }

type DeskNameplateProps = {
  children: string
  className?: string
  /** Kept for call-site compatibility — de-boxed eyebrow has no chrome. */
  variant?: DeskNameplateVariant
  /** Kept for call-site compatibility. */
  onDark?: boolean
}

/**
 * Slot 1 — WHO the desk serves.
 * De-boxed: uppercase label only (no pill / border / fill).
 */
export default function DeskNameplate({
  children,
  className = '',
  onDark = false,
}: DeskNameplateProps) {
  return (
    <div className={['inline-flex max-w-full items-center', className].filter(Boolean).join(' ')}>
      <span
        className={[
          'eyebrow !font-bold',
          onDark ? '!text-white/78' : '!text-[var(--quni-ink-3)]',
        ].join(' ')}
      >
        {children}
      </span>
    </div>
  )
}
