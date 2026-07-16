import type { UserDashboardSection } from './userDashboardNav'

export type LandlordMobileSectionTitle =
  | 'Dashboard'
  | 'Listings'
  | 'Messages'
  | 'Bookings'
  | 'Profile'

/** Landlord dashboard + messages share the mobile app chrome (bottom tabs + folded header title). */
export function isLandlordDashboardChromePath(pathname: string): boolean {
  return pathname === '/landlord/dashboard' || pathname.startsWith('/messages')
}

export function landlordMobileSectionTitle(pathname: string, search: string): LandlordMobileSectionTitle {
  if (pathname.startsWith('/messages')) return 'Messages'
  const tab = new URLSearchParams(search).get('tab')
  switch (tab) {
    case 'listings':
      return 'Listings'
    case 'bookings':
      return 'Bookings'
    case 'profile':
      return 'Profile'
    case 'messages':
      return 'Messages'
    default:
      return 'Dashboard'
  }
}

export function landlordMobileActiveSection(
  pathname: string,
  search: string,
): Exclude<UserDashboardSection, 'saved'> {
  if (pathname.startsWith('/messages')) return 'messages'
  const tab = new URLSearchParams(search).get('tab')
  switch (tab) {
    case 'listings':
      return 'listings'
    case 'bookings':
      return 'bookings'
    case 'profile':
      return 'profile'
    case 'messages':
      return 'messages'
    default:
      return 'overview'
  }
}
