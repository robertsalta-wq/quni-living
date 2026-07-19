import { Outlet, useLocation } from 'react-router-dom'
import { Suspense, useLayoutEffect, useRef } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { isRenterRole } from '../../lib/authProfile'
import {
  APP_SHELL_SCROLL_PB_CLASS,
  isAppShellSectionPath,
  isLandlordDesktopAppChrome,
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
 * Authenticated app destinations.
 *
 * Desktop (sm+): renter sections use the marketing Header. Landlord sections
 * and landlord listing-edit use AppShellHeader (Quni Dashboard). Mobile: slim
 * AppShellHeader + bottom tabs (listing hub chrome on mobile listing edit).
 */
export default function AppShellLayout() {
  const { role } = useAuthContext()
  const location = useLocation()
  const isMobile = useIsMobile()
  const section = isAppShellSectionPath(location.pathname)
  const listingHubChrome = isListingEditHubChromePath(location.pathname, isMobile)
  const listingDesktop = isListingEditDesktopSectionChrome(location.pathname, isMobile)
  const landlordDesktopChrome = isLandlordDesktopAppChrome(role, location.pathname, isMobile)

  /** Marketing Header on desktop for renter sections only (landlord listing edit uses app shell). */
  const useSiteHeader = !isMobile && !landlordDesktopChrome && (section || listingDesktop)
  const showSectionNav = useSiteHeader && section && !listingDesktop
  const showLandlordNav = role === 'landlord' && !listingHubChrome
  const showRenterNav = isRenterRole(role) && !listingHubChrome
  /** Measure sticky header height for listing-edit section pills when using app shell. */
  const measureListingEditChrome = listingDesktop && landlordDesktopChrome

  const chromeStackRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!useSiteHeader && !measureListingEditChrome) {
      document.documentElement.style.removeProperty('--site-header-height')
      return
    }
    const el = chromeStackRef.current
    if (!el) return

    const sync = () => {
      const h = Math.ceil(el.getBoundingClientRect().height)
      document.documentElement.style.setProperty('--site-header-height', `${h}px`)
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => {
      ro.disconnect()
      document.documentElement.style.removeProperty('--site-header-height')
    }
  }, [useSiteHeader, measureListingEditChrome, showSectionNav, location.pathname])

  return (
    <div
      className="flex min-h-0 w-full flex-1 flex-col max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:overflow-hidden"
      data-app-shell=""
      {...(listingDesktop ? { 'data-listing-edit-desktop': '' } : {})}
      {...(useSiteHeader ? { 'data-site-header-desktop': '' } : {})}
    >
      {useSiteHeader ? (
        <div
          ref={chromeStackRef}
          className="sticky top-0 z-50 hidden sm:block"
          data-desktop-chrome-stack=""
        >
          <Header embedded />
          {showSectionNav ? (
            <div className="border-b border-[var(--brand-header-border)] bg-[var(--brand-header-bg)]">
              <AppShellSectionNav flush />
            </div>
          ) : null}
        </div>
      ) : (
        <div ref={measureListingEditChrome ? chromeStackRef : undefined}>
          <AppShellHeader />
        </div>
      )}

      <main
        className={`flex min-h-0 w-full min-w-0 flex-1 flex-col max-sm:overflow-y-auto max-sm:overscroll-y-contain ${
          listingHubChrome ? '' : APP_SHELL_SCROLL_PB_CLASS
        }`}
        {...{ [DASHBOARD_MOBILE_SCROLL_ATTR]: '' }}
      >
        <OnboardingResumeBanner />
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
