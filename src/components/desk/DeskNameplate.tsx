type DeskNameplateProps = {
  children: string
  className?: string
}

/** Slot 1 - engraved brass plate. WHO the desk serves (not the topic). */
export default function DeskNameplate({ children, className = '' }: DeskNameplateProps) {
  return (
    <div
      className={[
        'inline-flex max-w-full items-center rounded-[4px] px-[13px] py-[6px]',
        'bg-[var(--quni-brass)] text-[var(--quni-brass-ink)]',
        'border-t border-white/34 border-b border-black/34',
        'shadow-[0_1px_3px_rgba(0,0,0,0.3)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className="whitespace-nowrap text-[10.5px] font-bold uppercase tracking-[0.14em] [text-shadow:0_1px_0_rgba(255,255,255,0.28)]"
      >
        {children}
      </span>
    </div>
  )
}
