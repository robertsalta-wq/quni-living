import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/** One `AppActionBar` item in `task` (action bar) mode. */
export type AppActionBarItem = {
  id: string
  label: string
  icon?: LucideIcon
  /** Current view indicator — coral, like `primary`. */
  active?: boolean
  /** Primary call to action — coral. */
  primary?: boolean
  disabled?: boolean
  /** Renders as a `Link` when set. */
  to?: string
  onClick?: () => void
}

type AppChromeActionsContextValue = {
  items: AppActionBarItem[]
  setItems: (items: AppActionBarItem[]) => void
}

const AppChromeActionsContext = createContext<AppChromeActionsContextValue | null>(null)

/** Wraps the app-shell `Outlet` — task pages register their `AppActionBar` items here. */
export function AppChromeActionsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AppActionBarItem[]>([])
  const value = useMemo(() => ({ items, setItems }), [items])
  return <AppChromeActionsContext.Provider value={value}>{children}</AppChromeActionsContext.Provider>
}

function useAppChromeActionsContext(): AppChromeActionsContextValue {
  const ctx = useContext(AppChromeActionsContext)
  if (!ctx) {
    throw new Error('useAppChromeActionsContext must be used within AppChromeActionsProvider')
  }
  return ctx
}

/* Hooks live next to the provider - consumers import from here */
/** Read the currently-registered action-bar items (consumed by `AppActionBar`). */
// eslint-disable-next-line react-refresh/only-export-components
export function useAppChromeActions(): AppActionBarItem[] {
  return useAppChromeActionsContext().items
}

/**
 * Register this page's `AppActionBar` items — sets on mount, clears on unmount.
 * Safe to pass a fresh array literal each render (setItems targets the provider's
 * state, not the caller's, so it does not retrigger the caller's own render loop).
 *
 * Pass `null` to opt out entirely (e.g. a parent that conditionally renders a child
 * which owns its own registration) — avoids the parent's effect clobbering the
 * child's on the same mount.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSetAppChromeActions(items: AppActionBarItem[] | null): void {
  const { setItems } = useAppChromeActionsContext()

  useEffect(() => {
    if (items == null) return
    setItems(items)
    return () => setItems([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])
}
