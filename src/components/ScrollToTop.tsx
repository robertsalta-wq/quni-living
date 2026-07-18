import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { appShellScrollSectionKey, isAppShellPath } from '../lib/appShell'
import {
  DASHBOARD_MOBILE_SCROLL_ATTR,
  getAppShellScrollElement,
  readAppShellScroll,
  saveAppShellScroll,
} from '../lib/appShellScroll'
import { resetWindowScrollSync } from '../lib/scrollToTop'

/**
 * Marketing routes: reset window scroll on navigation.
 * App shell: store/restore scroll per section key instead of always zeroing.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation()
  const { role } = useAuthContext()
  const prevKeyRef = useRef<string | null>(null)

  useLayoutEffect(() => {
    const shell = isAppShellPath(pathname)
    const sectionKey = appShellScrollSectionKey(pathname, search)
    const prevKey = prevKeyRef.current

    if (shell) {
      const main = getAppShellScrollElement() ?? document.querySelector(`[${DASHBOARD_MOBILE_SCROLL_ATTR}]`)

      if (prevKey && prevKey !== sectionKey && main instanceof HTMLElement) {
        saveAppShellScroll(prevKey, main.scrollTop)
      }

      prevKeyRef.current = sectionKey

      if (main instanceof HTMLElement) {
        const saved = readAppShellScroll(sectionKey)
        main.scrollTop = typeof saved === 'number' ? saved : 0
      }
      return
    }

    // Left the shell — persist last shell scroll if we had a key
    if (prevKey) {
      const main = getAppShellScrollElement()
      if (main) saveAppShellScroll(prevKey, main.scrollTop)
      prevKeyRef.current = null
    }

    resetWindowScrollSync()
  }, [pathname, search, role])

  return null
}
