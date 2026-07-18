import { Outlet, useLocation } from 'react-router-dom'
import { Suspense } from 'react'
import { useAuthContext } from '../../context/AuthContext'
import { isRenterRole } from '../../lib/authProfile'
import {
  APP_SHELL_SCROLL_PB_CLASS,
  isAppShellFocusPath,
} from '../../lib/appShell'
import { DASHBOARD_MOBILE_SCROLL_ATTR } from '../../lib/appShellScroll'
import { OnboardingResumeBanner } from '../OnboardingResumeBanner'
import DashboardChromeRouteFallback from '../DashboardChromeRouteFallback'
import Footer from '../Footer'
import LandlordMobileBottomNav from '../landlord/LandlordMobileBottomNav'
import RenterMobileBottomNav from '../student/RenterMobileBottomNav'
import AppShellHeader from './AppShellHeader'
import AppShellSectionNav from './AppShellSectionNav'

/**
 * Nested layout for authenticated app destinations (section + focus).
 * Owns header, scroll region, desktop section nav, and bottom tabs.
 */
export default function AppShellLayout() {
  const { role } = useAuthContext()
  const location = useLocation()
  const focus = isAppShellFocusPath(location.pathname)
  const showLandlordNav = role === 'landlord'
  const showRenterNav = isRenterRole(role)

  return (
    <div
      className="flex min-h-0 w-full flex-1 flex-col max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:overflow-hidden"
      data-app-shell=""
    >
      <AppShellHeader />
      <main
        className={`flex min-h-0 w-full min-w-0 flex-1 flex-col max-sm:overflow-y-auto max-sm:overscroll-y-contain ${APP_SHELL_SCROLL_PB_CLASS}`}
        {...{ [DASHBOARD_MOBILE_SCROLL_ATTR]: '' }}
      >
        <OnboardingResumeBanner />
        {!focus ? <AppShellSectionNav /> : null}
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
