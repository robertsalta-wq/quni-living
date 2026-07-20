/**
 * Authenticated app shell membership — section destinations + in-app focus flows.
 * Public marketing routes stay outside this tree.
 */
import type { UserRole } from './authProfile'
import { isRenterRole } from './authProfile'
import type { UserDashboardSection } from './userDashboardNav'

/**
 * Approximate action-bar content height (icons+label), rem.
 * The bar is in document flow under `<main>` — do **not** add matching
 * bottom padding on the scroll container (that left a dead white gap after
 * the floating AI button was removed). Overlay toasts should clear ~this
 * height + safe-area, not an extra FAB band.
 */
export const APP_SHELL_TAB_BAR_CONTENT_REM = 3.75

export type AppShellMode = 'section' | 'focus'

/**
 * Header and action bar are decided INDEPENDENTLY (docs/app-chrome-brief.md).
 * Header state must never dictate bar contents.
 */

/** Fixed exit from listing hub → listings tab (never history.back). */
export const LANDLORD_LISTINGS_TAB_HREF = '/landlord/dashboard?tab=listings'

/** Fixed exit from booking review → bookings tab. */
export const LANDLORD_BOOKINGS_TAB_HREF = '/landlord/dashboard?tab=bookings'

/**
 * What to put *inside* the shared header shell on an app-shell route.
 * `dashboard` = brand + "Dashboard" (+ desktop tabs). `task` = back + title
 * (renter apply only this PR — landlords always `dashboard`).
 */
export type AppChromeHeaderInner = 'dashboard' | 'task'

/**
 * Mobile bottom bar contents. Desktop is always `none` (bar is mobile-only).
 * `page-actions` = current page's controls via AppChromeActionsContext.
 */
export type AppChromeBarContents = 'nav' | 'page-actions' | 'none'

/**
 * Header inner slot — independent of the bar.
 * Landlords in the app shell: always dashboard. Renter apply (deferred): task on mobile.
 */
export function appChromeHeaderInner(
  pathname: string,
  role: UserRole | undefined,
  isMobile: boolean,
): AppChromeHeaderInner | null {
  if (!isAppShellPath(pathname)) return null
  if (role === 'landlord') return 'dashboard'
  if (role === 'admin') return 'dashboard'
  if (isRenterRole(role) && /^\/booking\//.test(pathname) && isMobile) return 'task'
  if (isRenterRole(role)) return 'dashboard'
  return 'dashboard'
}

/**
 * Mobile landlord Profile section drill-in (`?tab=profile&section=…`) → page-actions.
 */
export function isLandlordProfileSectionEditPath(pathname: string, search = ''): boolean {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (p !== '/landlord/dashboard') return false
  const params = new URLSearchParams(search)
  if (params.get('tab') !== 'profile') return false
  const section = params.get('section')
  return Boolean(
    section &&
      ['personal', 'address', 'about', 'agreements', 'payouts', 'insurance', 'languages'].includes(
        section,
      ),
  )
}

/**
 * Mobile action bar contents — independent of the header.
 * Landlord listing edit (hub + drill-ins) → page-actions.
 * Landlord Profile section drill-in → page-actions.
 * Booking review stays `nav` this PR (inline actions unchanged).
 * Renter apply stays `nav` this PR.
 */
export function appChromeBarContents(
  pathname: string,
  role: UserRole | undefined,
  isMobile: boolean,
  search = '',
): AppChromeBarContents {
  if (!isMobile) return 'none'
  if (!isAppShellPath(pathname)) return 'none'
  if ((role === 'landlord' || role === 'admin') && isListingEditPath(pathname)) {
    return 'page-actions'
  }
  if ((role === 'landlord' || role === 'admin') && isLandlordProfileSectionEditPath(pathname, search)) {
    return 'page-actions'
  }
  return 'nav'
}

/** @deprecated Coupled mode — do not use for new code. Prefer appChromeHeaderInner + appChromeBarContents. */
export type AppChromeMode = 'map' | 'task' | 'task-header'

/**
 * @deprecated Prefer appChromeHeaderInner + appChromeBarContents.
 * Kept only so old imports compile; always returns a coarse legacy label.
 */
export function appChromeMode(pathname: string, isMobile: boolean): AppChromeMode | null {
  if (!isAppShellPath(pathname)) return null
  if (/^\/booking\//.test(pathname)) return isMobile ? 'task-header' : 'map'
  return 'map'
}

/** Back-control destination label for task headers (`‹ {destination}`). */
export function appShellBackDestination(pathname: string): string {
  if (isListingEditPath(pathname)) return 'Listings'
  if (/^\/landlord\/bookings\//.test(pathname) || /^\/booking\//.test(pathname)) return 'Bookings'
  return 'Back'
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

/** Default back target — fixed URL only (never history.back). */
export function appShellFocusFallbackPath(role: UserRole | undefined, pathname: string): string {
  if (role === 'landlord') {
    if (pathname.startsWith('/landlord/property')) return LANDLORD_LISTINGS_TAB_HREF
    if (/^\/landlord\/bookings\//.test(pathname)) return LANDLORD_BOOKINGS_TAB_HREF
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
