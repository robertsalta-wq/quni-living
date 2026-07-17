import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import {
  DASHBOARD_MOBILE_SCROLL_ATTR,
  isDashboardMobileChromePath,
} from '../lib/dashboardMobileChrome'
import { resetWindowScrollSync } from '../lib/scrollToTop'

/** Scroll window (and dashboard mobile main region) to top when the route changes. */
export default function ScrollToTop() {
  const { pathname, search } = useLocation()
  const { role } = useAuthContext()
  const prevPathnameRef = useRef(pathname)

  useLayoutEffect(() => {
    const pathnameChanged = prevPathnameRef.current !== pathname
    prevPathnameRef.current = pathname

    const chromePath = isDashboardMobileChromePath(role, pathname)
    const main = document.querySelector(`[${DASHBOARD_MOBILE_SCROLL_ATTR}]`)

    // Same-route tab query changes under mobile chrome: only reset the main scroller.
    // Skipping window blur/reset avoids the jolt when switching Overview ↔ Listings etc.
    if (chromePath && !pathnameChanged) {
      if (main instanceof HTMLElement) main.scrollTop = 0
      return
    }

    resetWindowScrollSync()
    if (main instanceof HTMLElement) main.scrollTop = 0
  }, [pathname, search, role])

  return null
}
