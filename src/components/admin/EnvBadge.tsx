export interface EnvBadgeProps {
  env: 'live' | 'preview'
}

/**
 * Top-bar environment badge.
 *
 * Per HANDOFF.md §2: live=success palette, preview=warning palette.
 * Resting state only; PR 7 may wire env detection to `import.meta.env`.
 */
export function EnvBadge({ env }: EnvBadgeProps) {
  const live = env === 'live'
  return (
    <span
      className={
        live
          ? 'inline-flex items-center gap-1.5 rounded-admin-pill border border-emerald-700/20 bg-admin-success-bg px-2.5 py-1 text-[11px] font-semibold text-admin-success-fg'
          : 'inline-flex items-center gap-1.5 rounded-admin-pill border border-amber-700/20 bg-admin-warning-bg px-2.5 py-1 text-[11px] font-semibold text-admin-warning-fg'
      }
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-admin-success' : 'bg-admin-warning'}`}
        aria-hidden
      />
      {live ? 'Live' : 'Preview'}
    </span>
  )
}
