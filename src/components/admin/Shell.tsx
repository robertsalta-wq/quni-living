import type { ReactNode } from 'react'
import { ADMIN_SIDEBAR_WIDTH, AdminSidebar } from './Sidebar'
import { AdminTopBar } from './TopBar'

export interface AdminShellProps {
  children: ReactNode
}

/**
 * Top-level admin layout for the "Living Console" redesign.
 *
 * Cream sidebar (fixed) + sticky top bar + scrollable content area.
 * Until PR 3 lands the dedicated Living Console hero, `/admin` renders
 * the existing AdminOverview inside this shell — same chrome as every
 * other page in the redesign.
 */
export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-admin-surface-2 font-admin-sans text-admin-ink-2">
      <AdminSidebar />
      <div style={{ paddingLeft: ADMIN_SIDEBAR_WIDTH }}>
        <AdminTopBar />
        <main className="mx-auto w-full max-w-[1600px] px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  )
}
