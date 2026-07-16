import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { resetWindowScrollSync } from '../lib/scrollToTop'

/** Scroll window (and landlord mobile main region) to top when the route changes. */
export default function ScrollToTop() {
  const { pathname, search } = useLocation()

  useLayoutEffect(() => {
    resetWindowScrollSync()
    const main = document.querySelector('[data-landlord-mobile-scroll]')
    if (main instanceof HTMLElement) main.scrollTop = 0
  }, [pathname, search])

  return null
}
