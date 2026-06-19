function blurActiveElement(): void {
  const active = document.activeElement
  if (active instanceof HTMLElement) {
    active.blur()
  }
}

/** Force instant window scroll even when `<html>` uses scroll-smooth (CSS scroll-behavior). */
function runInstantWindowScroll(run: () => void): void {
  const html = document.documentElement
  const prevHtml = html.style.scrollBehavior
  const prevBody = document.body.style.scrollBehavior
  html.style.scrollBehavior = 'auto'
  document.body.style.scrollBehavior = 'auto'
  try {
    run()
  } finally {
    html.style.scrollBehavior = prevHtml
    document.body.style.scrollBehavior = prevBody
  }
}

/** Synchronous scroll reset before paint (route changes). Covers html/body/scrollingElement quirks on mobile WebViews. */
export function resetWindowScrollSync(): void {
  blurActiveElement()
  runInstantWindowScroll(() => {
    const root = document.scrollingElement ?? document.documentElement
    root.scrollTop = 0
    root.scrollLeft = 0
    if (document.body !== root) {
      document.body.scrollTop = 0
      document.body.scrollLeft = 0
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  })
}

/** Scroll the document to the top - retries help after layout shifts on mobile Safari. */
export function scrollWindowToTop(behavior: ScrollBehavior = 'auto'): void {
  if (behavior === 'auto' || behavior === 'instant') {
    resetWindowScrollSync()
    return
  }

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
  runInstantWindowScroll(() => {
    anchor.scrollIntoView({ block: 'start', behavior: 'instant' })
  })
  requestAnimationFrame(() => {
    runInstantWindowScroll(() => {
      anchor.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
  })
  window.setTimeout(() => {
    runInstantWindowScroll(() => {
      anchor.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
  }, 100)
}
