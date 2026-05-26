import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { scrollWindowToTop } from '../lib/scrollToTop'

/** Scroll window to top when the route pathname changes (e.g. footer / in-app links). */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    scrollWindowToTop('auto')
  }, [pathname])

  return null
}
