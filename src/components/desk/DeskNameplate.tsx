import type { DeskNameplateVariant } from '../../lib/deskNameplateVariants'

export type { DeskNameplateVariant }

type DeskNameplateProps = {
  children: string
  className?: string
  /** Kept for call-site compatibility — Paper & ink uses one flat treatment. */
  variant?: DeskNameplateVariant
  /** Kept for call-site compatibility — flat plate reads on light and dark desks. */
  onDark?: boolean
}

const labelBase =
  'whitespace-nowrap text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--quni-ink)]'

/**
 * Slot 1 — WHO the desk serves.
 * Paper & ink: flat eyebrow (ink on page + line hairline). Brass/metal removed.
 */
export default function DeskNameplate({
  children,
  className = '',
}: DeskNameplateProps) {
  return (
    <div
      className={[
        'inline-flex max-w-full items-center rounded-[4px] px-[13px] py-[6px]',
        'border border-[var(--quni-line)] bg-[var(--quni-page)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={labelBase}>{children}</span>
    </div>
  )
}
