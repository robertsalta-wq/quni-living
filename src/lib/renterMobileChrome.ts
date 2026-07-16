import type { UserDashboardSection } from './userDashboardNav'

export type RenterMobileSectionTitle = 'Dashboard' | 'Bookings' | 'Messages' | 'Profile'

export type RenterMobileSection = Exclude<UserDashboardSection, 'listings' | 'saved'>

/** Renter dashboard chrome paths: student-dashboard, messages, student-profile (+ alias). */
export function isRenterDashboardChromePath(pathname: string): boolean {
  return (
    pathname === '/student-dashboard' ||
    pathname.startsWith('/messages') ||
    pathname === '/student-profile' ||
    pathname === '/student/profile'
  )
}

export function renterMobileSectionTitle(pathname: string, search: string): RenterMobileSectionTitle {
  if (pathname.startsWith('/messages')) return 'Messages'
  if (pathname === '/student-profile' || pathname === '/student/profile') return 'Profile'
  const tab = new URLSearchParams(search).get('tab')
  if (tab === 'bookings') return 'Bookings'
  return 'Dashboard'
}

export function renterMobileActiveSection(pathname: string, search: string): RenterMobileSection {
  if (pathname.startsWith('/messages')) return 'messages'
  if (pathname === '/student-profile' || pathname === '/student/profile') return 'profile'
  const tab = new URLSearchParams(search).get('tab')
  if (tab === 'bookings') return 'bookings'
  return 'overview'
}
