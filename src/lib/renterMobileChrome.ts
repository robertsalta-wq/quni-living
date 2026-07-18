import type { UserDashboardSection } from './userDashboardNav'

export type RenterMobileSectionTitle = 'Dashboard' | 'Bookings' | 'Saved' | 'Messages' | 'Profile'

export type RenterMobileSection = Exclude<UserDashboardSection, 'listings'>

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
  if (tab === 'saved') return 'Saved'
  return 'Dashboard'
}

export function renterMobileActiveSection(pathname: string, search: string): RenterMobileSection {
  if (pathname.startsWith('/messages')) return 'messages'
  if (pathname === '/student-profile' || pathname === '/student/profile') return 'profile'
  const tab = new URLSearchParams(search).get('tab')
  if (tab === 'bookings') return 'bookings'
  if (tab === 'saved') return 'saved'
  return 'overview'
}
