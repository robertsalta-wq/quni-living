import { useCallback, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import AiSparkleIcon from '../AiSparkleIcon'
import ChatPanel from './ChatPanel'
import { useBookingFlowChrome } from '../../context/BookingFlowChromeContext'
import { useAuthContext } from '../../context/AuthContext'
import type { UserRole } from '../../lib/authProfile'
import { isDashboardMobileChromePath } from '../../lib/dashboardMobileChrome'

/** Mobile routes with a fixed bottom action bar that the FAB must sit above. */
function mobileHasStickyBottomBar(pathname: string, role: UserRole | undefined): boolean {
  if (/^\/landlord\/bookings\/[^/]+\/review$/.test(pathname)) return true
  if (/^\/(listings|properties)\/[^/]+$/.test(pathname)) return true
  if (isDashboardMobileChromePath(role, pathname)) return true
  return false
}

const MOBILE_FAB_BASE =
  'touch-manipulation fixed z-[10000] flex min-h-[3rem] min-w-[3rem] flex-col items-center justify-center gap-0.5 rounded-full bg-[#FF6F61] px-3 py-2 text-white shadow-sm hover:bg-[#e85d52] focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 focus:ring-offset-2 max-md:right-4 md:bottom-6 md:right-6 md:min-h-0 md:min-w-0 md:px-4 md:py-3'

export default function AIChatWidget() {
  const { pathname } = useLocation()
  const { role } = useAuthContext()
  const { elevateFloatingChrome } = useBookingFlowChrome()
  const [open, setOpen] = useState(false)

  const mobileBottomClass = useMemo(() => {
    if (elevateFloatingChrome) {
      return 'max-md:bottom-[calc(22rem+env(safe-area-inset-bottom,0px))]'
    }
    if (mobileHasStickyBottomBar(pathname, role)) {
      return 'max-md:bottom-[max(5rem,calc(0.75rem+env(safe-area-inset-bottom,0px)))]'
    }
    return 'max-md:bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))]'
  }, [elevateFloatingChrome, pathname, role])

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen(true), [])

  return (
    <>
      <button
        type="button"
        onClick={() => toggle()}
        aria-label="Open AI chat"
        className={`${MOBILE_FAB_BASE} ${mobileBottomClass}`}
      >
        <AiSparkleIcon className="h-5 w-5 shrink-0" />
        <span className="text-[10px] font-bold leading-none tracking-wide">AI</span>
      </button>

      {open ? <ChatPanel variant="widget" onClose={close} /> : null}
    </>
  )
}

