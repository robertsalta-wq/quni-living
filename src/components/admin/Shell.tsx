import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { ADMIN_SIDEBAR_WIDTH, AdminSidebar } from './Sidebar'
import { AdminTopBar } from './TopBar'
import { HomeBackdrop } from './HomeBackdrop'

export interface AdminShellProps {
  children: ReactNode
}

/**
 * Top-level admin layout for the "Living Console" redesign.
 *
 * Two variants:
 * 1. **Home** (`/admin`): no sidebar, no top bar, soft aerial-style backdrop,
 *    narrower 1280px column. Hero/quick-actions live inside the page content.
 * 2. **Standard** (everything else): cream sidebar (fixed) + sticky top bar +
 *    wide scrollable content area.
 *
 * The variant decision lives here so page code never has to know which chrome
 * it's wearing.
 */
export function AdminShell({ children }: AdminShellProps) {
  const location = useLocation()
  const isHome = location.pathname === '/admin' || location.pathname === '/admin/'

  if (isHome) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-admin-surface-1 font-admin-sans text-admin-ink-2">
        <HomeBackdrop />
        <main className="relative z-10 mx-auto w-full max-w-[1280px] px-6 pb-14 pt-10 lg:px-10">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-admin-surface-2 font-admin-sans text-admin-ink-2">
      <AdminSidebar />
      <div style={{ paddingLeft: ADMIN_SIDEBAR_WIDTH }}>
        <AdminTopBar />
        {/*
         * Standard admin page frame.
         *
         * Left-aligned (no `mx-auto`, no `max-w-*`) so content sits flush
         * against the sidebar - Bookings table, Pricing tabs, etc. expand to
         * fill the viewport rather than getting centred inside a 1600px column.
         * The Living Console home variant above keeps its own centred layout.
         */}
        <main className="w-full px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  )
}
