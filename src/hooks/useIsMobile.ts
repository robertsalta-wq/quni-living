import { useEffect, useState } from 'react'
import { MOBILE_MAX_WIDTH_MQ } from '../lib/breakpoints'

function readIsMobile(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(MOBILE_MAX_WIDTH_MQ).matches
}

/**
 * True when viewport is below Tailwind `sm` (640px).
 * Shared by listing-edit page gate and app-shell chrome so they cannot drift.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(readIsMobile)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MAX_WIDTH_MQ)
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
