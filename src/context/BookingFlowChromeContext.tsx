import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type BookingFlowChromeContextValue = {
  /** When true, global floating UI (feedback, AI) sits higher so it clears the Stripe payment step. */
  elevateFloatingChrome: boolean
  setElevateFloatingChrome: (value: boolean) => void
}

const BookingFlowChromeContext = createContext<BookingFlowChromeContextValue | null>(null)

export function BookingFlowChromeProvider({ children }: { children: ReactNode }) {
  const [elevateFloatingChrome, setElevateFloatingChromeState] = useState(false)
  const setElevateFloatingChrome = useCallback((value: boolean) => {
    setElevateFloatingChromeState(value)
  }, [])

  const value = useMemo(
    () => ({ elevateFloatingChrome, setElevateFloatingChrome }),
    [elevateFloatingChrome, setElevateFloatingChrome],
  )

  return <BookingFlowChromeContext.Provider value={value}>{children}</BookingFlowChromeContext.Provider>
}

export function useBookingFlowChrome() {
  const ctx = useContext(BookingFlowChromeContext)
  return (
    ctx ?? {
      elevateFloatingChrome: false,
      setElevateFloatingChrome: () => {},
    }
  )
}
