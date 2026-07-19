import { Outlet, useLocation } from 'react-router-dom'
import { Suspense, useLayoutEffect, useRef } from 'react'
import { appChromeMode, isListingEditDesktopSectionChrome, APP_SHELL_SCROLL_PB_CLASS } from '../../lib/appShell'
import { DASHBOARD_MOBILE_SCROLL_ATTR } from '../../lib/appShellScroll'
import { OnboardingResumeBanner } from '../OnboardingResumeBanner'
import DashboardChromeRouteFallback from '../DashboardChromeRouteFallback'
import Footer from '../Footer'
import AppActionBar from './AppActionBar'
import AppHeader from './AppHeader'
import { AppChromeActionsProvider } from './AppChromeActionsContext'
import { useIsMobile } from '../../hooks/useIsMobile'

/**
 * Authenticated app destinations — one `AppHeader` + one `AppActionBar`, driven by
 * `appChromeMode` (see docs/app-chrome-brief.md). Pages never render their own chrome.
 */
export default function AppShellLayout() {
  const location = useLocation()
  const isMobile = useIsMobile()
  const mode = appChromeMode(location.pathname, isMobile)
  /** Desktop listing edit — sticky section-pill offsets need the header's measured height. */
  const listingDesktop = isListingEditDesktopSectionChrome(location.pathname, isMobile)

  const headerRef = useRef<HTMLDivElement>(null)
  /** Measure header on desktop so sticky page rails can clear Map chrome. */
  const measureHeader = !isMobile && mode != null

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

  /** Both shells are mobile-only nav/action bars — reserve scroll clearance whenever one mounts. */
  const showBar = isMobile && mode != null

  return (
    <AppChromeActionsProvider>
      <div
        className="flex min-h-0 w-full flex-1 flex-col max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:overflow-hidden"
        data-app-shell=""
        {...(listingDesktop ? { 'data-listing-edit-desktop': '' } : {})}
      >
        {/*
          Sticky lives on this wrapper (sm+), not on <header> itself.
          overflow-x-clip on a sticky element breaks stickiness in Chromium;
          the header child may still clip horizontally.
        */}
        <div ref={headerRef} className="sticky top-0 z-50 shrink-0 max-sm:static">
          <AppHeader />
        </div>

        <main
          className={`flex min-h-0 w-full min-w-0 flex-1 flex-col max-sm:overflow-y-auto max-sm:overscroll-y-contain ${
            showBar ? APP_SHELL_SCROLL_PB_CLASS : ''
          }`}
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
