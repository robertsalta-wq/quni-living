import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
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
  setItems: (items: AppActionBarItem[] | ((prev: AppActionBarItem[]) => AppActionBarItem[])) => void
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

/** Stable key for bar *content* — ignores onClick/icon identity (those change every render). */
export function appChromeActionsSignature(items: AppActionBarItem[] | null): string | null {
  if (items == null) return null
  return items
    .map((i) =>
      [i.id, i.label, i.active ? '1' : '0', i.primary ? '1' : '0', i.disabled ? '1' : '0', i.to ?? ''].join(
        ':',
      ),
    )
    .join('|')
}

/**
 * Register this page's `AppActionBar` items.
 *
 * Depends on a content signature, not array/function identity — otherwise a parent
 * re-render (new `onClick` closures) retriggers setItems → provider re-render →
 * infinite loop (React #185 / maximum update depth).
 *
 * Pass `null` to opt out (parent defers to a child that owns registration).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSetAppChromeActions(items: AppActionBarItem[] | null): void {
  const { setItems } = useAppChromeActionsContext()
  const latestRef = useRef(items)
  latestRef.current = items
  const signature = appChromeActionsSignature(items)

  useEffect(() => {
    if (signature == null) return
    const latest = latestRef.current
    if (latest == null) return

    // Bind clicks through the ref so handlers stay fresh without changing signature.
    setItems(
      latest.map((item) => ({
        ...item,
        onClick: item.onClick
          ? () => {
              latestRef.current?.find((x) => x.id === item.id)?.onClick?.()
            }
          : undefined,
      })),
    )
    return () => setItems([])
  }, [signature, setItems])
}
