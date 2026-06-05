function blurActiveElement(): void {
  const active = document.activeElement
  if (active instanceof HTMLElement) {
    active.blur()
  }
}

/** Scroll the document to the top - retries help after layout shifts on mobile Safari. */
export function scrollWindowToTop(behavior: ScrollBehavior = 'auto'): void {
  blurActiveElement()

  window.scrollTo({ top: 0, left: 0, behavior })
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior })
  })
  window.setTimeout(() => {
    window.scrollTo({ top: 0, left: 0, behavior })
  }, 100)
}

/** Bring an anchor into view below the fixed mobile header (uses `.scroll-mt-below-header`). */
export function scrollAnchorBelowHeader(anchor: HTMLElement | null | undefined): void {
  if (!anchor) {
    scrollWindowToTop()
    return
  }
  blurActiveElement()
  anchor.scrollIntoView({ block: 'start', behavior: 'auto' })
  requestAnimationFrame(() => {
    anchor.scrollIntoView({ block: 'start', behavior: 'auto' })
  })
  window.setTimeout(() => {
    anchor.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, 100)
}
