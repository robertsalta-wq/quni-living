import { Outlet, useLocation } from 'react-router-dom'
import { Suspense, useLayoutEffect, useRef } from 'react'
import { appChromeHeaderInner, isListingEditDesktopSectionChrome } from '../../lib/appShell'
import { DASHBOARD_MOBILE_SCROLL_ATTR } from '../../lib/appShellScroll'
import { OnboardingResumeBanner } from '../OnboardingResumeBanner'
import DashboardChromeRouteFallback from '../DashboardChromeRouteFallback'
import Footer from '../Footer'
import AppActionBar from './AppActionBar'
import AppHeader from './AppHeader'
import { AppChromeActionsProvider } from './AppChromeActionsContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useAuthContext } from '../../context/AuthContext'

/**
 * Authenticated app destinations — AppHeader + AppActionBar decided independently
 * (docs/app-chrome-brief.md). Pages never declare header geometry.
 */
export default function AppShellLayout() {
  const location = useLocation()
  const isMobile = useIsMobile()
  const { role } = useAuthContext()
  const headerInner = appChromeHeaderInner(location.pathname, role, isMobile)
  const listingDesktop = isListingEditDesktopSectionChrome(location.pathname, isMobile)

  const headerRef = useRef<HTMLDivElement>(null)
  const measureHeader = !isMobile && headerInner != null

  useLayoutEffect(() => {
    if (!measureHeader) {
      document.documentElement.style.removeProperty('--site-header-height')
      return
    }
    const el = headerRef.current
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
  }, [measureHeader, location.pathname])

  return (
    <AppChromeActionsProvider>
      <div
        className="flex min-h-0 w-full flex-1 flex-col max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:overflow-hidden"
        data-app-shell=""
        {...(listingDesktop ? { 'data-listing-edit-desktop': '' } : {})}
      >
        {/*
          Sticky lives on this wrapper (sm+), not on <header> itself.
          overflow-x-clip on a sticky element breaks stickiness in Chromium.
        */}
        <div ref={headerRef} className="sticky top-0 z-50 shrink-0 max-sm:static">
          <AppHeader />
        </div>

        <main
          className="flex min-h-0 w-full min-w-0 flex-1 flex-col max-sm:overflow-y-auto max-sm:overscroll-y-contain"
          {...{ [DASHBOARD_MOBILE_SCROLL_ATTR]: '' }}
        >
          <OnboardingResumeBanner />
          <Suspense fallback={<DashboardChromeRouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
        <AppActionBar />
        <div className="hidden sm:block">
          <Footer />
        </div>
      </div>
    </AppChromeActionsProvider>
  )
}
