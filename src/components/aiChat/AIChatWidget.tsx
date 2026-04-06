import { useCallback, useState } from 'react'
import AiSparkleIcon from '../AiSparkleIcon'
import ChatPanel from './ChatPanel'
import { useBookingFlowChrome } from '../../context/BookingFlowChromeContext'

export default function AIChatWidget() {
  const { elevateFloatingChrome } = useBookingFlowChrome()
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen(true), [])

  return (
    <>
      <button
        type="button"
        onClick={() => toggle()}
        aria-label="Open AI chat"
        className={
          elevateFloatingChrome
            ? 'touch-manipulation fixed max-md:bottom-[calc(22rem+env(safe-area-inset-bottom,0px))] bottom-20 right-6 z-[10000] flex min-h-[3rem] min-w-[3rem] flex-col items-center justify-center gap-0.5 rounded-full bg-[#FF6F61] px-3 py-2 text-white shadow-sm hover:bg-[#e85d52] focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 focus:ring-offset-2 sm:bottom-6 sm:min-h-0 sm:min-w-0 sm:px-4 sm:py-3'
            : 'touch-manipulation fixed bottom-20 right-6 z-[10000] flex min-h-[3rem] min-w-[3rem] flex-col items-center justify-center gap-0.5 rounded-full bg-[#FF6F61] px-3 py-2 text-white shadow-sm hover:bg-[#e85d52] focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 focus:ring-offset-2 sm:bottom-6 sm:min-h-0 sm:min-w-0 sm:px-4 sm:py-3'
        }
      >
        <AiSparkleIcon className="h-5 w-5 shrink-0" />
        <span className="text-[10px] font-bold leading-none tracking-wide">AI</span>
      </button>

      {open ? <ChatPanel variant="widget" onClose={close} /> : null}
    </>
  )
}

