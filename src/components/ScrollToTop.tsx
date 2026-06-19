import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { scrollWindowToTop } from '../lib/scrollToTop'

/** Scroll window to top when the route pathname changes (e.g. footer / in-app links). */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    scrollWindowToTop('auto')
  }, [pathname])

  return null
}
