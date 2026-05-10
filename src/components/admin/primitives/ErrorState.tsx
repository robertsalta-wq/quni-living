import type { ReactNode } from 'react'
import { Icon } from '../Icon'
import { Button } from './Button'

export interface ErrorStateProps {
  title?: string
  description?: ReactNode
  /** When provided, renders the canonical navy secondary "Retry" button. */
  onRetry?: () => void
  /** Override the retry button label (default: `Retry`). */
  retryLabel?: string
  className?: string
}

/**
 * Canonical admin error state.
 *
 * Per HANDOFF.md §3: danger-tinted square with `alert-triangle` glyph +
 * `Couldn't load this` + navy SECONDARY retry button (not coral — error
 * retries are never the primary action of a page).
 */
export function ErrorState({
  title = "Couldn't load this",
  description = 'Try again, or contact support if it keeps happening.',
  onRetry,
  retryLabel = 'Retry',
  className,
}: ErrorStateProps) {
  return (
    <div
      className={
        'flex flex-col items-center justify-center px-7 py-10 text-center ' + (className ?? '')
      }
      role="alert"
    >
      <div className="mb-3.5 grid h-11 w-11 place-items-center rounded-xl border border-admin-danger/20 bg-admin-danger-bg">
        <Icon name="alert-triangle" size={20} className="text-admin-danger-fg" />
      </div>
      <p className="text-[15px] font-semibold text-admin-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-[280px] text-[13px] text-admin-ink-4">{description}</p>
      {onRetry ? (
        <Button kind="secondary" size="md" icon="rotate-cw" onClick={onRetry} className="mt-4">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}
