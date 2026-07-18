import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuthContext } from './AuthContext'
import { isRenterRole } from '../lib/authProfile'
import {
  deleteSavedProperty,
  fetchSavedPropertyIds,
  insertSavedProperty,
  listSavedProperties,
} from '../lib/savedProperties'
import type { Property } from '../lib/listings'

type Toast = { message: string } | null

type SavedPropertiesContextValue = {
  /** True while initial ids load for a logged-in renter. */
  idsLoading: boolean
  savedIds: ReadonlySet<string>
  isSaved: (propertyId: string) => boolean
  /** Guests and renters may use Save; landlords/admins should not see the control. */
  canUseSave: boolean
  toast: Toast
  toggleSave: (propertyId: string) => Promise<'saved' | 'unsaved' | 'needs_auth' | 'error'>
  listSaved: () => Promise<Property[]>
  removeFromLocal: (propertyId: string) => void
  markSavedLocal: (propertyId: string) => void
}

const SavedPropertiesContext = createContext<SavedPropertiesContextValue | null>(null)

export function SavedPropertiesProvider({ children }: { children: ReactNode }) {
  const { user, role, loading: authLoading } = useAuthContext()
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set())
  const [idsLoading, setIdsLoading] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const toastTimerRef = useRef<number | null>(null)
  const canUseSave = !user || isRenterRole(role)

  const showToast = useCallback((message: string) => {
    setToast({ message })
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 2800)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user || !isRenterRole(role)) {
      setSavedIds(new Set())
      setIdsLoading(false)
      return
    }

    let cancelled = false
    setIdsLoading(true)
    void (async () => {
      try {
        const ids = await fetchSavedPropertyIds()
        if (!cancelled) setSavedIds(new Set(ids))
      } catch {
        if (!cancelled) setSavedIds(new Set())
      } finally {
        if (!cancelled) setIdsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id, role, authLoading])

  const isSaved = useCallback((propertyId: string) => savedIds.has(propertyId), [savedIds])

  const markSavedLocal = useCallback((propertyId: string) => {
    setSavedIds((prev) => {
      if (prev.has(propertyId)) return prev
      const next = new Set(prev)
      next.add(propertyId)
      return next
    })
  }, [])

  const removeFromLocal = useCallback((propertyId: string) => {
    setSavedIds((prev) => {
      if (!prev.has(propertyId)) return prev
      const next = new Set(prev)
      next.delete(propertyId)
      return next
    })
  }, [])

  const toggleSave = useCallback(
    async (propertyId: string): Promise<'saved' | 'unsaved' | 'needs_auth' | 'error'> => {
      if (!user) return 'needs_auth'
      if (!isRenterRole(role)) return 'error'

      const currentlySaved = savedIds.has(propertyId)
      if (currentlySaved) {
        removeFromLocal(propertyId)
        try {
          await deleteSavedProperty(propertyId)
          showToast('Removed from saved')
          return 'unsaved'
        } catch {
          markSavedLocal(propertyId)
          showToast('Couldn’t unsave — try again')
          return 'error'
        }
      }

      markSavedLocal(propertyId)
      try {
        await insertSavedProperty(propertyId)
        showToast('Saved to your list')
        return 'saved'
      } catch {
        removeFromLocal(propertyId)
        showToast('Couldn’t save — try again')
        return 'error'
      }
    },
    [user, role, savedIds, removeFromLocal, markSavedLocal, showToast],
  )

  const listSaved = useCallback(() => listSavedProperties(), [])

  const value = useMemo<SavedPropertiesContextValue>(
    () => ({
      idsLoading,
      savedIds,
      isSaved,
      canUseSave,
      toast,
      toggleSave,
      listSaved,
      removeFromLocal,
      markSavedLocal,
    }),
    [
      idsLoading,
      savedIds,
      isSaved,
      canUseSave,
      toast,
      toggleSave,
      listSaved,
      removeFromLocal,
      markSavedLocal,
    ],
  )

  return (
    <SavedPropertiesContext.Provider value={value}>
      {children}
      {toast ? (
        <div
          className="fixed bottom-24 left-1/2 z-[80] w-[min(100%-2rem,20rem)] -translate-x-1/2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-center text-sm font-medium text-stone-800 shadow-lg sm:bottom-8"
          role="status"
        >
          {toast.message}
        </div>
      ) : null}
    </SavedPropertiesContext.Provider>
  )
}

export function useSavedProperties(): SavedPropertiesContextValue {
  const ctx = useContext(SavedPropertiesContext)
  if (!ctx) {
    throw new Error('useSavedProperties must be used within SavedPropertiesProvider')
  }
  return ctx
}
