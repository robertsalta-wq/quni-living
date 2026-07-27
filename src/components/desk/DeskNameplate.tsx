type DeskNameplateProps = {
  children: string
  className?: string
}

/** Slot 1 — engraved brass plate. WHO the desk serves (not the topic). */
export default function DeskNameplate({ children, className = '' }: DeskNameplateProps) {
  return (
    <div
      className={[
        'inline-flex max-w-full items-center rounded-[var(--radius-sm)] px-[var(--space-3)] py-[var(--space-1)]',
        'bg-[var(--quni-brass)] text-[var(--quni-brass-ink)]',
        'border-t border-white/34 border-b border-black/34',
        'shadow-[var(--shadow-1)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="whitespace-nowrap text-quni-micro font-bold uppercase [text-shadow:0_1px_0_color-mix(in_srgb,var(--quni-surface-1)_45%,transparent)]">
        {children}
      </span>
    </div>
  )
}
