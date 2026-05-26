import { useEffect, useRef, type RefObject } from 'react'
import { scrollAnchorBelowHeader, scrollWindowToTop } from '../lib/scrollToTop'

type Options = {
  /** Do not scroll on the first effect run (initial mount). */
  skipInitial?: boolean
  /** Optional form block to bring into view (uses scroll-margin-below-header). */
  anchorRef?: RefObject<HTMLElement | null>
}

/**
 * Scroll to the top when a wizard step / tab key changes so users are not left
 * at the bottom of the previous step after tapping Continue on mobile.
 */
export function useScrollToTopOnChange(
  key: string | number | boolean | null | undefined,
  options?: Options,
): void {
  const isInitial = useRef(true)
  const { skipInitial = true, anchorRef } = options ?? {}

  useEffect(() => {
    if (skipInitial && isInitial.current) {
      isInitial.current = false
      return
    }
    isInitial.current = false

    const anchor = anchorRef?.current
    if (anchor) {
      scrollAnchorBelowHeader(anchor)
      return
    }
    scrollWindowToTop('auto')
  }, [key, skipInitial, anchorRef])
}
