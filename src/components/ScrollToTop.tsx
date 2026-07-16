import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { DASHBOARD_MOBILE_SCROLL_ATTR } from '../lib/dashboardMobileChrome'
import { resetWindowScrollSync } from '../lib/scrollToTop'

/** Scroll window (and dashboard mobile main region) to top when the route changes. */
export default function ScrollToTop() {
  const { pathname, search } = useLocation()

  useLayoutEffect(() => {
    resetWindowScrollSync()
    const main = document.querySelector(`[${DASHBOARD_MOBILE_SCROLL_ATTR}]`)
    if (main instanceof HTMLElement) main.scrollTop = 0
  }, [pathname, search])

  return null
}
