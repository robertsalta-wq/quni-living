import type { CollapsibleProfileSectionProps, SectionStatus } from './types'

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

function StatusPill({ status }: { status: SectionStatus }) {
  if (status === 'done') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-admin-pill bg-admin-success-bg px-[11px] py-1 text-xs font-semibold text-admin-success-fg">
        <CheckIcon />
        Done
      </span>
    )
  }
  if (status === 'optional') {
    return (
      <span className="inline-flex shrink-0 whitespace-nowrap rounded-admin-pill bg-admin-surface-3 px-[11px] py-1 text-xs font-semibold text-admin-ink-4">
        Optional
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 whitespace-nowrap rounded-admin-pill bg-admin-warning-bg px-[11px] py-1 text-xs font-semibold text-admin-warning-fg">
      To do
    </span>
  )
}

export default function CollapsibleProfileSection({
  ordinal,
  icon,
  title,
  subtitle,
  status,
  summary,
  expanded,
  onToggle,
  editLabel = 'Edit',
  children,
}: CollapsibleProfileSectionProps) {
  const showSummaryRow = !expanded && status === 'done' && summary != null

  return (
    <div className="overflow-hidden rounded-admin-lg border border-admin-line bg-white shadow-admin-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-3.5 border-0 bg-transparent px-5 py-[18px] text-left"
        aria-expanded={expanded}
      >
        {ordinal != null ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-admin-surface-3 text-xs font-bold text-admin-ink-3">
            {ordinal}
          </span>
        ) : null}

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-admin-md bg-admin-coral-tint text-admin-coral [&_svg]:h-[18px] [&_svg]:w-[18px]">
          {icon}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-admin-ink">{title}</span>
          {subtitle ? (
            <span className="mt-0.5 block text-[12.5px] text-admin-ink-4">{subtitle}</span>
          ) : null}
        </span>

        <StatusPill status={status} />

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
      </button>

      {expanded ? (
        <div className="border-t border-admin-line-soft px-5 pb-[22px] pt-[18px]">{children}</div>
      ) : null}

      {showSummaryRow ? (
        <div className="flex items-center gap-2.5 border-t border-admin-line-soft px-5 py-3.5 pb-4">
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
    </div>
  )
}
