import type { ReactNode } from 'react'

/** Shared incomplete-profile chrome — matches ProfileReadinessDriver collapsed incomplete. */
export const PROFILE_INCOMPLETE_NUDGE_CARD_CLASS =
  'quni-card border-admin-warning/40 bg-admin-warning-bg'

function LockGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export function ProfileIncompleteNudgeChevron({ expanded }: { expanded?: boolean }) {
  return (
    <svg
      className={`h-[18px] w-[18px] shrink-0 stroke-admin-warning-fg transition-transform duration-200 ${
        expanded ? 'rotate-180' : ''
      }`}
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
  )
}

export function ProfileIncompleteNudgeArrow() {
  return (
    <svg
      className="h-[18px] w-[18px] shrink-0 stroke-admin-warning-fg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

type Props = {
  title?: string
  subtitle: string
  trailing?: ReactNode
  className?: string
}

/** Lock + title + next-step subtitle + trailing affordance. */
export function ProfileIncompleteNudge({
  title = 'Finish your profile',
  subtitle,
  trailing,
  className,
}: Props) {
  return (
    <span className={['flex w-full items-center gap-3', className].filter(Boolean).join(' ')}>
      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-admin-warning text-white">
        <LockGlyph />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-admin-warning-fg">{title}</span>
        <span className="mt-0.5 block text-[12.5px] text-admin-warning-fg/85">{subtitle}</span>
      </span>
      {trailing}
    </span>
  )
}
