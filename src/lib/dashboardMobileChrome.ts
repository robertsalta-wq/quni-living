import type { UserRole } from './authProfile'
import { isRenterRole } from './authProfile'
import {
  appShellActiveSection,
  appShellFocusTitle,
  isAppShellPath,
  isDashboardMobileChromePath as isAppShellChromeForRole,
} from './appShell'
import {
  landlordMobileSectionTitle,
  type LandlordMobileSectionTitle,
} from './landlordMobileChrome'
import {
  renterMobileSectionTitle,
  type RenterMobileSectionTitle,
} from './renterMobileChrome'
import { userDashboardHomePath } from './userDashboardNav'

export type DashboardMobileSectionTitle = LandlordMobileSectionTitle | RenterMobileSectionTitle

export { DASHBOARD_MOBILE_SCROLL_ATTR } from './appShellScroll'
export { isAppShellPath, isAppShellFocusPath, isAppShellSectionPath } from './appShell'

/**
 * Shared gate for landlord/renter mobile app chrome (bottom tabs + shell header).
 * Membership lives in `appShell.ts`; this keeps older call sites working.
 */
export function isDashboardMobileChromePath(
  role: UserRole | undefined,
  pathname: string,
): boolean {
  return isAppShellChromeForRole(role, pathname)
}

export function dashboardMobileSectionTitle(
  role: UserRole | undefined,
  pathname: string,
  search: string,
): DashboardMobileSectionTitle | null {
  if (!isAppShellPath(pathname)) return null
  if (role === 'landlord') {
    if (pathname.startsWith('/landlord/property')) return 'Listings'
    if (/^\/landlord\/bookings\//.test(pathname)) return 'Bookings'
    return landlordMobileSectionTitle(pathname, search)
  }
  if (isRenterRole(role)) {
    if (/^\/booking\//.test(pathname)) return 'Bookings'
    return renterMobileSectionTitle(pathname, search)
  }
  // Focus title for admin property edit
  if (role === 'admin') return appShellFocusTitle(pathname) as DashboardMobileSectionTitle
  return null
}

/** Home destination helpers for app chrome (dashboard overview — not marketing `/`). */
export function dashboardMobileHomePath(role: UserRole | undefined): string {
  if (role === 'landlord') return userDashboardHomePath('landlord')
  if (isRenterRole(role)) return userDashboardHomePath('renter')
  return '/'
}

export function dashboardShellActiveSection(
  role: UserRole | undefined,
  pathname: string,
  search: string,
) {
  return appShellActiveSection(role, pathname, search)
}
