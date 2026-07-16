import type { UserRole } from './authProfile'
import { isRenterRole } from './authProfile'
import {
  isLandlordDashboardChromePath,
  landlordMobileSectionTitle,
  type LandlordMobileSectionTitle,
} from './landlordMobileChrome'
import {
  isRenterDashboardChromePath,
  renterMobileSectionTitle,
  type RenterMobileSectionTitle,
} from './renterMobileChrome'
import { userDashboardHomePath } from './userDashboardNav'

export type DashboardMobileSectionTitle = LandlordMobileSectionTitle | RenterMobileSectionTitle

/**
 * Shared gate for landlord/renter mobile app chrome (bottom tabs + folded header).
 * Role-specific path lists live in landlordMobileChrome / renterMobileChrome.
 */
export function isDashboardMobileChromePath(
  role: UserRole | undefined,
  pathname: string,
): boolean {
  if (role === 'landlord') return isLandlordDashboardChromePath(pathname)
  if (isRenterRole(role)) return isRenterDashboardChromePath(pathname)
  return false
}

export function dashboardMobileSectionTitle(
  role: UserRole | undefined,
  pathname: string,
  search: string,
): DashboardMobileSectionTitle | null {
  if (role === 'landlord') return landlordMobileSectionTitle(pathname, search)
  if (isRenterRole(role)) return renterMobileSectionTitle(pathname, search)
  return null
}

/** Home destination for the folded Quni wordmark link. */
export function dashboardMobileHomePath(role: UserRole | undefined): string {
  if (role === 'landlord') return userDashboardHomePath('landlord')
  if (isRenterRole(role)) return userDashboardHomePath('renter')
  return '/'
}

/** Attribute on `<main>` so ScrollToTop resets the chrome scroll region. */
export const DASHBOARD_MOBILE_SCROLL_ATTR = 'data-dashboard-mobile-scroll'
