/**
 * Authenticated app shell membership — section destinations + in-app focus flows.
 * Public marketing routes stay outside this tree.
 */
import type { UserRole } from './authProfile'
import { isRenterRole } from './authProfile'
import type { UserDashboardSection } from './userDashboardNav'

/** Approximate tab bar content height (icons+label); safe-area is added separately in CSS. */
export const APP_SHELL_TAB_BAR_CONTENT_REM = 3.75

/** Bottom padding so scroll content clears the tab bar + home indicator (mobile only). */
export const APP_SHELL_SCROLL_PB_CLASS =
  'max-sm:pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))]'

/** FAB / toast offset above the tab bar on mobile when app shell is active. */
export const APP_SHELL_FAB_BOTTOM_CLASS =
  'max-md:bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]'

export type AppShellMode = 'section' | 'focus'

/**
 * Chrome mode — drives `AppHeader` + `AppActionBar` (see docs/app-chrome-brief.md).
 * `map` = brand + "Dashboard" + nav bar. `task` = back + title + action bar.
 * `task-header` (Phase 1 only) = back + title header, but nav bar still (booking
 * review / renter apply — convert to `task` in Phase 2).
 */
export type AppChromeMode = 'map' | 'task' | 'task-header'

/**
 * One function decides chrome mode for both shells.
 *
 * Landlord rule: every app-shell surface is Map (dashboard template). Landlords
 * never enter Task / task-header chrome — exit is always via global nav (or
 * marketing Header outside the shell).
 *
 * Renter apply keeps task-header on mobile / Map on desktop until a later pass.
 */
export function appChromeMode(pathname: string, isMobile: boolean): AppChromeMode | null {
  const mode = appShellMode(pathname)
  if (mode == null) return null
  if (mode === 'section') return 'map'
  // Landlord listing edit + booking review — always dashboard chrome.
  if (isListingEditPath(pathname)) return 'map'
  if (/^\/landlord\/bookings\//.test(pathname)) return 'map'
  // Renter apply: task-header on mobile, Map on desktop.
  return isMobile ? 'task-header' : 'map'
}

/** Back-control destination label for task / task-header headers (`‹ {destination}`). */
export function appShellBackDestination(pathname: string): string {
  if (isListingEditPath(pathname)) return 'Listings'
  if (/^\/landlord\/bookings\//.test(pathname) || /^\/booking\//.test(pathname)) return 'Bookings'
  return 'Back'
}

export type AppChromeHeaderKind = 'map' | 'task'
export type AppChromeBarKind = 'nav' | 'action' | 'none'

/** Header shape for a mode — `task` and `task-header` share the same (back + title) shape, §1a. */
export function appChromeHeaderKind(mode: AppChromeMode): AppChromeHeaderKind {
  return mode === 'map' ? 'map' : 'task'
}

/**
 * Bar shape for a mode + viewport — the bottom bar is mobile-only (§3 "Desktop
 * placement"); `task-header` keeps the Nav bar in Phase 1 (§2 "is a *pass*").
 */
export function appChromeBarKind(mode: AppChromeMode, isMobile: boolean): AppChromeBarKind {
  if (!isMobile) return 'none'
  return mode === 'task' ? 'action' : 'nav'
}

export function isAppShellPath(pathname: string): boolean {
  return appShellMode(pathname) != null
}

export function isAppShellFocusPath(pathname: string): boolean {
  return appShellMode(pathname) === 'focus'
}

export function isAppShellSectionPath(pathname: string): boolean {
  return appShellMode(pathname) === 'section'
}

/** null = not under the authenticated app shell (marketing / auth / admin). */
export function appShellMode(pathname: string): AppShellMode | null {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`

  if (p.startsWith('/admin')) return null

  // Focus (still framed — top bar is back/close; listing edit hub hides bottom tabs)
  if (/^\/landlord\/bookings\/[^/]+\/review\/?$/.test(p)) return 'focus'
  if (p === '/landlord/property/new' || p.startsWith('/landlord/property/new/')) return 'focus'
  if (p.startsWith('/landlord/property/edit/')) return 'focus'
  if (/^\/booking\/[^/]+\/?$/.test(p)) return 'focus'

  // Section destinations
  if (p === '/student-dashboard' || p === '/student-profile' || p === '/student/profile') return 'section'
  if (p === '/landlord/dashboard') return 'section'
  if (p.startsWith('/messages')) return 'section'

  return null
}

/** Scroll-restore / section-nav key (pathname + meaningful query). */
export function appShellScrollSectionKey(pathname: string, search: string): string {
  const mode = appShellMode(pathname)
  if (!mode) return pathname

  if (pathname.startsWith('/messages')) {
    return pathname // preserve per-conversation scroll separately
  }

  if (pathname === '/landlord/dashboard' || pathname === '/student-dashboard') {
    const tab = new URLSearchParams(search).get('tab') || 'overview'
    return `${pathname}?tab=${tab}`
  }

  if (pathname === '/student-profile' || pathname === '/student/profile') {
    const tab = new URLSearchParams(search).get('tab') || 'profile'
    return `${pathname}?tab=${tab}`
  }

  return pathname
}

export function appShellActiveSection(
  role: UserRole | undefined,
  pathname: string,
  search: string,
): UserDashboardSection | null {
  if (role === 'landlord') {
    if (pathname.startsWith('/messages')) return 'messages'
    if (pathname.startsWith('/landlord/property')) return 'listings'
    if (/^\/landlord\/bookings\//.test(pathname)) return 'bookings'
    if (pathname === '/landlord/dashboard') {
      const tab = new URLSearchParams(search).get('tab')
      if (tab === 'listings' || tab === 'bookings' || tab === 'profile' || tab === 'messages') return tab
      return 'overview'
    }
    return null
  }
  if (isRenterRole(role)) {
    if (pathname.startsWith('/messages')) return 'messages'
    if (pathname === '/student-profile' || pathname === '/student/profile') return 'profile'
    if (/^\/booking\//.test(pathname)) return 'bookings'
    if (pathname === '/student-dashboard') {
      const tab = new URLSearchParams(search).get('tab')
      if (tab === 'bookings' || tab === 'saved') return tab
      return 'overview'
    }
    return null
  }
  return null
}

export function appShellFocusTitle(pathname: string): string {
  if (/^\/landlord\/bookings\//.test(pathname)) return 'Booking review'
  if (pathname === '/landlord/property/new' || pathname.startsWith('/landlord/property/new/')) {
    if (pathname.endsWith('/basic')) return 'Basic info'
    if (pathname.includes('/section/')) return 'Edit section'
    return 'New listing'
  }
  if (pathname.startsWith('/landlord/property/edit/')) {
    if (pathname.endsWith('/basic')) return 'Basic info'
    if (pathname.includes('/section/')) return 'Edit section'
    return 'Edit listing'
  }
  if (/^\/booking\//.test(pathname)) return 'Apply'
  return 'Back'
}

/** Listing edit paths (hub or long form). */
export function isListingEditPath(pathname: string): boolean {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (p === '/landlord/property/new' || p.startsWith('/landlord/property/new/')) return true
  if (p.startsWith('/landlord/property/edit/')) return true
  return false
}

/**
 * Cream hub chrome + no bottom tabs — mobile listing edit only (`sm` breakpoint).
 * Desktop landlord listing edit uses AppHeader Map chrome (see isLandlordDesktopAppChrome).
 */
export function isListingEditHubChromePath(pathname: string, isMobile: boolean): boolean {
  return isMobile && isListingEditPath(pathname)
}

/**
 * Landlord destinations on sm+ use the authenticated app-shell header
 * (not the public marketing Header). Includes section tabs and listing edit.
 * Mobile is unchanged (slim header / listing hub chrome).
 */
export function isLandlordDesktopAppChrome(
  role: UserRole | undefined,
  pathname: string,
  isMobile: boolean,
): boolean {
  if (isMobile || role !== 'landlord') return false
  return isAppShellSectionPath(pathname) || isListingEditPath(pathname)
}

/** Desktop listing edit path — sticky section-pill offsets (`data-listing-edit-desktop`). */
export function isListingEditDesktopSectionChrome(pathname: string, isMobile: boolean): boolean {
  return !isMobile && isListingEditPath(pathname)
}

/** @deprecated Prefer isListingEditPath / isListingEditHubChromePath */
export function isListingEditHubPath(pathname: string): boolean {
  return isListingEditPath(pathname)
}

/** Default back target when no location.state.returnTo is present. */
export function appShellFocusFallbackPath(role: UserRole | undefined, pathname: string): string {
  if (role === 'landlord') {
    if (pathname.startsWith('/landlord/property')) return '/landlord/dashboard?tab=listings'
    if (/^\/landlord\/bookings\//.test(pathname)) return '/landlord/dashboard?tab=bookings'
    return '/landlord/dashboard'
  }
  if (isRenterRole(role)) {
    if (/^\/booking\//.test(pathname)) return '/student-dashboard?tab=bookings'
    return '/student-dashboard'
  }
  return '/'
}

/** @deprecated Prefer isAppShellPath — kept for gradual call-site migration. */
export function isDashboardMobileChromePath(role: UserRole | undefined, pathname: string): boolean {
  if (!isAppShellPath(pathname)) return false
  if (role === 'landlord' || isRenterRole(role)) return true
  // Admin editing a listing still uses app shell chrome without role bottom nav
  if (role === 'admin' && isAppShellFocusPath(pathname)) return true
  return false
}
