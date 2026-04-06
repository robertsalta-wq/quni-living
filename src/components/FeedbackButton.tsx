import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import * as Sentry from '@sentry/react'
import { useBookingFlowChrome } from '../context/BookingFlowChromeContext'

export default function FeedbackButton() {
  const { elevateFloatingChrome } = useBookingFlowChrome()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [email, setEmail] = useState('')
  const [thanks, setThanks] = useState(false)
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const thanksCloseTimerRef = useRef<number | null>(null)

  const close = useCallback(() => {
    if (thanksCloseTimerRef.current != null) {
      window.clearTimeout(thanksCloseTimerRef.current)
      thanksCloseTimerRef.current = null
    }
    const root = dialogRef.current
    const active = document.activeElement
    if (root && active instanceof HTMLElement && root.contains(active)) {
      active.blur()
    }
    setOpen(false)
    setThanks(false)
    setText('')
    setEmail('')
  }, [])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  useEffect(() => {
    return () => {
      if (thanksCloseTimerRef.current != null) {
        window.clearTimeout(thanksCloseTimerRef.current)
      }
    }
  }, [])

  function handleBackdropPointerDown(ev: PointerEvent<HTMLDivElement>) {
    if (ev.target !== ev.currentTarget) return
    close()
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const feedback = text.trim()
    if (!feedback) return
    Sentry.captureMessage('User feedback: ' + feedback, {
      level: 'info',
      extra: { email, feedback },
    })
    setThanks(true)
    thanksCloseTimerRef.current = window.setTimeout(() => {
      thanksCloseTimerRef.current = null
      close()
    }, 1600)
  }

  const fabSharedClass =
    'touch-manipulation fixed z-[70] bottom-6 right-4 sm:right-6 rounded-full border border-gray-300 bg-gray-100 px-3 py-2 sm:px-4 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2'

  const modal =
    open &&
    createPortal(
      <div
        className="fixed inset-0 z-[10050] flex touch-none items-center justify-center bg-black/40 p-4 sm:p-6"
        role="presentation"
        onPointerDown={handleBackdropPointerDown}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="max-h-[min(92dvh,100%)] w-full max-w-md touch-pan-y overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white p-5 shadow-lg [padding-bottom:max(1.25rem,env(safe-area-inset-bottom,0px))]"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {thanks ? (
            <p className="text-center text-sm font-medium text-gray-900" id={titleId}>
              Thanks, we&apos;ll look into it!
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 id={titleId} className="text-lg font-semibold text-gray-900">
                Report a problem
              </h2>
              <div>
                <label htmlFor="feedback-text" className="sr-only">
                  What went wrong?
                </label>
                <textarea
                  id="feedback-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="What went wrong?"
                  rows={4}
                  className="w-full touch-pan-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="feedback-email" className="sr-only">
                  Your email (optional)
                </label>
                <input
                  id="feedback-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email (optional)"
                  className="w-full touch-manipulation rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={close}
                  className="touch-manipulation rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="touch-manipulation rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            </form>
          )}
        </div>
      </div>,
      document.body,
    )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          elevateFloatingChrome
            ? `${fabSharedClass} max-md:bottom-[calc(15rem+env(safe-area-inset-bottom,0px))]`
            : `${fabSharedClass} max-md:bottom-[calc(7rem+env(safe-area-inset-bottom,0px))]`
        }
      >
        Report a problem
      </button>
      {modal}
    </>
  )
}
