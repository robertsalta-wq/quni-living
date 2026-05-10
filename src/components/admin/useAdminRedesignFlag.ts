import { useEffect, useState } from 'react'

const STORAGE_KEY = 'quni_admin_redesign'

/**
 * Feature flag for the "Living Console" admin redesign.
 *
 * Toggle via URL param: `?redesign=1` to enable, `?redesign=0` to disable.
 * The choice persists in localStorage so subsequent navigations keep the
 * same shell. Until PR 7 we keep the legacy admin layout reachable so we
 * can fall back without redeploying.
 */
export function useAdminRedesignFlag(): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => readInitial())

  useEffect(() => {
    function readFromUrl() {
      if (typeof window === 'undefined') return
      const url = new URLSearchParams(window.location.search)
      const param = url.get('redesign')
      if (param === '1') {
        try {
          localStorage.setItem(STORAGE_KEY, 'true')
        } catch {
          /* ignore */
        }
        setEnabled(true)
      } else if (param === '0') {
        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch {
          /* ignore */
        }
        setEnabled(false)
      }
    }
    readFromUrl()
    window.addEventListener('popstate', readFromUrl)
    return () => window.removeEventListener('popstate', readFromUrl)
  }, [])

  return enabled
}

function readInitial(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const url = new URLSearchParams(window.location.search)
    const param = url.get('redesign')
    if (param === '1') {
      try {
        localStorage.setItem(STORAGE_KEY, 'true')
      } catch {
        /* ignore */
      }
      return true
    }
    if (param === '0') {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
      return false
    }
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}
