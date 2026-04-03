import { useCallback, useState } from 'react'
import ChatPanel from './ChatPanel'

export default function AIChatWidget() {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen(true), [])

  return (
    <>
      <button
        type="button"
        onClick={() => toggle()}
        aria-label="Open AI chat"
        className="fixed bottom-6 right-6 z-[10000] rounded-full bg-[#FF6F61] p-4 text-white shadow-sm hover:bg-[#e85d52] focus:outline-none focus:ring-2 focus:ring-[#FF6F61]/40 focus:ring-offset-2"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 14h6" />
        </svg>
      </button>

      {open ? <ChatPanel variant="widget" onClose={close} /> : null}
    </>
  )
}

