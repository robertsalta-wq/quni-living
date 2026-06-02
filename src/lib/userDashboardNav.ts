import type { UserRole } from './authProfile'

export type UserDashboardSection = 'listings' | 'messages' | 'bookings' | 'saved' | 'profile'

export type UserDashboardCrumb = {
  label: string
  to?: string
}

export function userDashboardHomePath(role: Exclude<UserRole, 'admin' | null>): string {
  return role === 'landlord' ? '/landlord/dashboard' : '/student-dashboard'
}

export function userDashboardProfilePath(role: Exclude<UserRole, 'admin' | null>): string {
  return role === 'landlord' ? '/landlord/profile' : '/student-profile'
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

export function landlordBookingsPath(): string {
  return '/landlord/dashboard?tab=bookings'
}
