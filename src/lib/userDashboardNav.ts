import type { UserRole } from './authProfile'
import { landlordDashboardProfilePath } from './landlordDashboardProfilePaths'

export type UserDashboardSection = 'overview' | 'listings' | 'messages' | 'bookings' | 'saved' | 'profile'

export type UserDashboardCrumb = {
  label: string
  to?: string
}

export function userDashboardHomePath(role: Exclude<UserRole, 'admin' | null>): string {
  return role === 'landlord' ? '/landlord/dashboard' : '/student-dashboard'
}

export function userDashboardProfilePath(role: Exclude<UserRole, 'admin' | null>): string {
  return role === 'landlord' ? landlordDashboardProfilePath() : '/student-profile'
}

/** Breadcrumb trail with dashboard home as the first segment when `segments` is empty or omits it. */
export function userDashboardBreadcrumbs(
  role: Exclude<UserRole, 'admin' | null>,
  ...segments: UserDashboardCrumb[]
): UserDashboardCrumb[] {
  const home: UserDashboardCrumb = { label: 'Dashboard', to: userDashboardHomePath(role) }
  if (segments.length === 0) return [home]
  if (segments[0]?.label === 'Dashboard' && segments[0]?.to) return segments
  return [home, ...segments]
}

export function studentDashboardTabPath(section: 'overview' | 'bookings' | 'saved'): string {
  if (section === 'overview') return userDashboardHomePath('renter')
  return `${userDashboardHomePath('renter')}?tab=${section}`
}

export function landlordBookingsPath(view?: 'requests' | 'calendar' | 'timeline'): string {
  if (!view || view === 'requests') return '/landlord/dashboard?tab=bookings'
  return `/landlord/dashboard?tab=bookings&view=${view}`
}

export function landlordDashboardTabPath(
  section: Exclude<UserDashboardSection, 'messages' | 'saved'>,
): string {
  if (section === 'overview') return userDashboardHomePath('landlord')
  return `/landlord/dashboard?tab=${section}`
}
