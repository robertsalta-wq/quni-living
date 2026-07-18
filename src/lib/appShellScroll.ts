/** Attribute on app-shell `<main>` so ScrollToTop / hide-on-scroll can find the scroller. */
export const DASHBOARD_MOBILE_SCROLL_ATTR = 'data-dashboard-mobile-scroll'

const scrollBySection = new Map<string, number>()

export function saveAppShellScroll(sectionKey: string, scrollTop: number): void {
  scrollBySection.set(sectionKey, scrollTop)
}

export function readAppShellScroll(sectionKey: string): number | undefined {
  return scrollBySection.get(sectionKey)
}

export function clearAppShellScroll(sectionKey?: string): void {
  if (sectionKey) scrollBySection.delete(sectionKey)
  else scrollBySection.clear()
}

export function getAppShellScrollElement(): HTMLElement | null {
  const el = document.querySelector(`[${DASHBOARD_MOBILE_SCROLL_ATTR}]`)
  return el instanceof HTMLElement ? el : null
}
