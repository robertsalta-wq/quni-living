import type { ReactNode } from 'react'

export interface TabItem<T extends string> {
  id: T
  label: string
  /** Optional sub-label rendered next to the main label (e.g. "$99 flat"). */
  sub?: ReactNode
  /** Optional small count badge — used by Change log etc. */
  count?: number
}

export interface TabsProps<T extends string> {
  items: ReadonlyArray<TabItem<T>>
  active: T
  onChange: (next: T) => void
  /** Optional aria-label for the tablist. */
  ariaLabel?: string
}

/**
 * Underlined tab strip pattern used on the redesigned Pricing page.
 *
 * Renders a row of buttons separated by a 1px bottom line; the active tab gets
 * a 2px coral bottom border (HANDOFF §3 Pricing acceptance criterion). Style
 * tokens come from `admin-coral`, `admin-line`, `admin-ink-*`.
 */
export function Tabs<T extends string>({ items, active, onChange, ariaLabel }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="-mb-px flex flex-wrap gap-0 border-b border-admin-line">
      {items.map((t) => {
        const isActive = t.id === active
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={
              'inline-flex items-baseline gap-1.5 px-3.5 py-2.5 text-[14px] font-semibold transition-colors ' +
              (isActive
                ? 'border-b-2 border-admin-coral text-admin-ink'
                : 'border-b-2 border-transparent text-admin-ink-4 hover:text-admin-ink-2')
            }
          >
            {t.label}
            {t.sub ? (
              <span className={'text-[12px] font-medium ' + (isActive ? 'text-admin-ink-4' : 'text-admin-ink-5')}>
                · {t.sub}
              </span>
            ) : null}
            {typeof t.count === 'number' ? (
              <span className="ml-1 rounded-admin-pill bg-admin-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-admin-ink-3">
                {t.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
