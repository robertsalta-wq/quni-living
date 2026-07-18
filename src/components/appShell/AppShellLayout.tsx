import { Outlet, useLocation } from 'react-router-dom'
import { Suspense } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { isRenterRole } from '../../lib/authProfile'
import {
  APP_SHELL_SCROLL_PB_CLASS,
  isAppShellFocusPath,
  isListingEditDesktopSectionChrome,
  isListingEditHubChromePath,
} from '../../lib/appShell'
import { DASHBOARD_MOBILE_SCROLL_ATTR } from '../../lib/appShellScroll'
import { OnboardingResumeBanner } from '../OnboardingResumeBanner'
import DashboardChromeRouteFallback from '../DashboardChromeRouteFallback'
import Footer from '../Footer'
import Header from '../Header'
import LandlordMobileBottomNav from '../landlord/LandlordMobileBottomNav'
import RenterMobileBottomNav from '../student/RenterMobileBottomNav'
import AppShellHeader from './AppShellHeader'
import AppShellSectionNav from './AppShellSectionNav'
import { useIsMobile } from '../../hooks/useIsMobile'

/**
 * Nested layout for authenticated app destinations (section + focus).
 * Owns header, scroll region, desktop section nav, and bottom tabs.
 *
 * Desktop listing edit uses the standard marketing Header (sticky) so chrome
 * matches the rest of the site; mobile listing hub keeps cream app-shell chrome.
 */
export default function AppShellLayout() {
  const { role } = useAuthContext()
  const location = useLocation()
  const isMobile = useIsMobile()
  const focus = isAppShellFocusPath(location.pathname)
  const listingHubChrome = isListingEditHubChromePath(location.pathname, isMobile)
  const listingDesktopMarketing = isListingEditDesktopSectionChrome(location.pathname, isMobile)
  /** Dashboard strip only on real section destinations — not desktop listing edit. */
  const showSectionNav = !focus && !listingDesktopMarketing
  const showLandlordNav = role === 'landlord' && !listingHubChrome
  const showRenterNav = isRenterRole(role) && !listingHubChrome

  return (
    <div
      className="flex min-h-0 w-full flex-1 flex-col max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:overflow-hidden"
      data-app-shell=""
      {...(listingDesktopMarketing ? { 'data-listing-edit-desktop': '' } : {})}
    >
      {listingDesktopMarketing ? <Header /> : <AppShellHeader />}
      <main
        className={`flex min-h-0 w-full min-w-0 flex-1 flex-col max-sm:overflow-y-auto max-sm:overscroll-y-contain ${
          listingHubChrome ? '' : APP_SHELL_SCROLL_PB_CLASS
        } ${listingDesktopMarketing ? 'max-md:pt-main-below-fixed-header md:pt-0' : ''}`}
        {...{ [DASHBOARD_MOBILE_SCROLL_ATTR]: '' }}
      >
        <OnboardingResumeBanner />
        {showSectionNav ? <AppShellSectionNav /> : null}
        <Suspense fallback={<DashboardChromeRouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      {showLandlordNav ? <LandlordMobileBottomNav /> : null}
      {showRenterNav ? <RenterMobileBottomNav /> : null}
      <div className="hidden sm:block">
        <Footer />
      </div>
    </div>
  )
}
