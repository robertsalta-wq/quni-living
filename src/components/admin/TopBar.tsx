import { useLocation } from 'react-router-dom'
import { Icon } from './Icon'
import { EnvBadge } from './EnvBadge'
import { adminBreadcrumb } from './nav'

/**
 * Sticky top bar for the admin shell.
 *
 * Renders a breadcrumb ({zone} → {page}), placeholder search box, env badge,
 * notifications icon, and user pill. Search and notifications are stubs in
 * PR 1; per HANDOFF.md §7 we don't pull in a global state store, and search
 * wiring is out of scope for this PR.
 */
export function AdminTopBar() {
  const location = useLocation()
  const crumb = adminBreadcrumb(location.pathname)

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-admin-line bg-white/90 px-6 backdrop-blur lg:px-10">
      <nav
        className="flex min-w-0 items-center gap-2 text-[13px] text-admin-ink-4"
        aria-label="Breadcrumb"
      >
        <span className="font-medium">{crumb.zone}</span>
        <Icon name="chevron-right" size={12} className="text-admin-ink-5" />
        <span className="truncate font-semibold text-admin-ink">{crumb.page}</span>
      </nav>

      <div className="flex flex-1 justify-center">
        <div className="flex w-full max-w-[440px] items-center gap-2 rounded-admin-md border border-admin-line bg-admin-surface-2 px-2.5 py-1.5">
          <Icon name="search" size={14} className="text-admin-ink-5" />
          <input
            type="search"
            placeholder="Search bookings, students, properties…"
            className="flex-1 border-0 bg-transparent text-[13px] text-admin-ink-2 placeholder:text-admin-ink-5 focus:outline-none"
            aria-label="Admin search (coming soon)"
          />
          <span className="hidden rounded border border-admin-line bg-white px-1.5 py-px text-[11px] font-semibold text-admin-ink-4 shadow-sm md:inline-flex">
            ⌘K
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <EnvBadge env="live" />
        <button
          type="button"
          title="Notifications"
          className="relative rounded-md p-1.5 text-admin-ink-3 transition-colors hover:bg-admin-coral-tint hover:text-admin-coral-active"
        >
          <Icon name="bell" size={17} />
          <span
            className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-admin-coral ring-2 ring-white"
            aria-hidden
          />
        </button>
      </div>
    </header>
  )
}
