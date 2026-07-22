import type { SectionProps, SectionStatus, SectionTone } from './sectionTypes'

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="13"
      height="13"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z"
      />
    </svg>
  )
}

export function StatusPill({ status }: { status: SectionStatus }) {
  if (status === 'done') {
    return (
      <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-admin-pill bg-admin-success-bg px-2 py-1 text-xs font-semibold text-admin-success-fg">
        <CheckIcon />
        Done
      </span>
    )
  }
  if (status === 'optional') {
    return (
      <span className="inline-flex shrink-0 whitespace-nowrap rounded-admin-pill bg-admin-surface-3 px-2 py-1 text-xs font-semibold text-admin-ink-4">
        Optional
      </span>
    )
  }
  if (status === 'locked') {
    return (
      <span className="inline-flex shrink-0 whitespace-nowrap rounded-admin-pill bg-admin-surface-3 px-2 py-1 text-xs font-semibold text-admin-ink-5">
        Locked
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 whitespace-nowrap rounded-admin-pill bg-admin-warning-bg px-2 py-1 text-xs font-semibold text-admin-warning-fg">
      To do
    </span>
  )
}

function toneBorderClass(tone: SectionTone): string {
  if (tone === 'warning') return 'border-admin-warning'
  if (tone === 'danger') return 'border-admin-danger'
  if (tone === 'ai') return 'border-admin-ai-border'
  return 'border-admin-line'
}

function iconTileClass(tone: SectionTone): string {
  if (tone === 'ai') {
    return 'bg-admin-ai-tint text-admin-ai [&_svg]:h-[18px] [&_svg]:w-[18px]'
  }
  return 'bg-admin-coral-tint text-admin-coral [&_svg]:h-[18px] [&_svg]:w-[18px]'
}

/**
 * Collapsible page section chrome (status-bearing surfaces).
 *
 * Layout rule (enforce in review): Section never contains another bordered/
 * tinted card. Children may include plain content, tables, dividers, and
 * non-card chrome only. Panels that own their own border+background must
 * accept `embedded` (or equivalent) and strip that chrome when nested here —
 * same rule as BookingReviewActionCard.
 */
export default function Section({
  id,
  icon,
  title,
  sectionNum,
  subtitle,
  status,
  summary,
  expanded = false,
  onToggle,
  editLabel = 'Edit',
  collapsible = true,
  tone = 'default',
  children,
}: SectionProps) {
  const isOpen = !collapsible || expanded
  const showBody = isOpen && children != null
  const showSummaryRow = collapsible && !expanded && summary != null
  const showDoneGlyph = status === 'done'

  const headerInner = (
    <>
      {icon != null ? (
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-admin-md ${iconTileClass(tone)}`}
        >
          {icon}
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-[7px]">
          {sectionNum ? (
            <span className="shrink-0 text-[var(--text-caption-size)] font-bold tracking-[0.02em] text-admin-coral">
              {sectionNum}
            </span>
          ) : null}
          <span className="block text-[15px] font-semibold text-admin-ink">{title}</span>
        </span>
        {subtitle ? (
          <span
            className={`mt-0.5 block text-[12.5px] ${tone === 'ai' ? 'text-admin-ai' : 'text-admin-ink-4'}`}
          >
            {subtitle}
          </span>
        ) : null}
      </span>

      {status != null ? <StatusPill status={status} /> : null}

      {collapsible ? (
        <svg
          className={`h-[18px] w-[18px] shrink-0 stroke-admin-ink-5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      ) : null}
    </>
  )

  return (
    <section
      id={id}
      className={`quni-card scroll-mt-below-header overflow-hidden font-sans ${toneBorderClass(tone)}`}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full cursor-pointer items-center gap-2.5 border-0 bg-transparent px-5 py-[18px] text-left"
          aria-expanded={expanded}
          aria-controls={`${id}-body`}
        >
          {headerInner}
        </button>
      ) : (
        <div className="flex w-full items-center gap-2.5 px-5 py-[18px] text-left">{headerInner}</div>
      )}

      {showBody ? (
        <div
          id={`${id}-body`}
          className="border-t border-admin-line-soft px-5 pb-[22px] pt-[18px]"
        >
          {children}
        </div>
      ) : null}

      {showSummaryRow ? (
        <div className="flex items-center gap-2.5 border-t border-admin-line-soft px-5 py-3.5 pb-4">
          {showDoneGlyph ? (
            <svg
              className="h-4 w-4 shrink-0 text-admin-success"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z"
              />
            </svg>
          ) : null}
          <span className="min-w-0 truncate text-sm text-admin-ink-3">{summary}</span>
          <button
            type="button"
            onClick={onToggle}
            className="ml-auto shrink-0 border-0 bg-transparent text-[13px] font-semibold text-admin-coral hover:text-admin-coral-hover"
          >
            {editLabel}
          </button>
        </div>
      ) : null}
    </section>
  )
}
