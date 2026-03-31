import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Scroll window to top when the route pathname changes (e.g. footer / in-app links). */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}
