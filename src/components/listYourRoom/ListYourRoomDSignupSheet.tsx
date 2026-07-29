import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Signup from '../../pages/Signup'

type ListYourRoomDSignupSheetProps = {
  open: boolean
  onOpen: (opener: HTMLElement) => void
  onClose: () => void
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

/** Sticky v8 signup bar and native slide-up dialog, shared across breakpoints. */
export default function ListYourRoomDSignupSheet({ open, onOpen, onClose }: ListYourRoomDSignupSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const scrollBodyRef = useRef<HTMLDivElement>(null)
  const [entered, setEntered] = useState(false)

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
      const frame = requestAnimationFrame(() => setEntered(true))
      return () => cancelAnimationFrame(frame)
    }
    if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>('[data-invite-primary-cta="true"]')?.focus()
    })
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const scrollBody = scrollBodyRef.current
    if (!scrollBody) return

    function revealFocusedField() {
      const active = document.activeElement
      if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement)) {
        return
      }
      requestAnimationFrame(() => active.scrollIntoView({ block: 'center', behavior: 'smooth' }))
    }

    scrollBody.addEventListener('focusin', revealFocusedField)
    window.visualViewport?.addEventListener('resize', revealFocusedField)
    return () => {
      scrollBody.removeEventListener('focusin', revealFocusedField)
      window.visualViewport?.removeEventListener('resize', revealFocusedField)
    }
  }, [open])

  return (
    <>
      <div
        className="fixed bottom-0 left-1/2 z-40 w-full max-w-site -translate-x-1/2 border-t border-white/20 bg-[var(--quni-ink)] px-4 pt-3 text-white [padding-bottom:max(var(--space-3),env(safe-area-inset-bottom,0px))]"
        role="region"
        aria-label="List your property"
      >
        <div className="mx-auto flex max-w-site items-center gap-3">
          <button
            type="button"
            onClick={(event) => onOpen(event.currentTarget)}
            className="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span className="block text-sm font-bold text-white sm:inline">List your property</span>
            <span className="hidden text-sm text-white/70 sm:inline"> · Free to list · verified students · </span>
            <span className="block text-xs text-white/70 sm:hidden">Free to list · verified students</span>
            <span className="hidden text-sm font-bold text-white sm:inline">$99 only when someone moves in</span>
          </button>
          <span className="hidden shrink-0 text-xl font-bold tabular-nums text-white sm:block">$99.00</span>
          <button
            type="button"
            onClick={(event) => onOpen(event.currentTarget)}
            className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--quni-coral)] px-4 py-3 text-sm font-bold text-white transition-colors duration-[var(--dur-base)] ease-[var(--ease-standard)] hover:bg-[var(--quni-coral-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            List my property →
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-label="List your property"
        onCancel={(event) => {
          event.preventDefault()
          onClose()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
          }
        }}
        onClose={() => {
          setEntered(false)
          onClose()
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
        className={[
          'fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-hidden rounded-t-[var(--radius-lg)] border border-b-0 border-[var(--quni-line)] bg-[var(--quni-surface-1)] p-0 text-[var(--quni-ink)] shadow-[var(--shadow-3)] backdrop:bg-[var(--quni-ink)]/60',
          'transition-transform duration-[var(--dur-slow)] ease-[var(--ease-standard)]',
          entered ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        <div className="flex max-h-[90dvh] flex-col">
          <header className="shrink-0 bg-[var(--quni-ink)] px-5 pb-4 pt-3 text-white">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="flex w-full justify-center py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label="Close signup sheet"
              >
                <span className="h-1 w-10 rounded-[var(--radius-pill)] bg-white/40" aria-hidden />
              </button>
            </div>
            <div className="mt-2 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">For landlords</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-white">List your property</h2>
                <p className="mt-1 text-sm text-white/70">One-off on accept. No subscription.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold tabular-nums text-white">$99.00</span>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>
          </header>
          <div
            ref={scrollBodyRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 [padding-bottom:max(var(--space-5),env(safe-area-inset-bottom,0px))]"
          >
            <div className="mx-auto max-w-lg">
              <Signup embedLandlordInvite embedHideHeading embedConsentAfterForm />
            </div>
          </div>
        </div>
      </dialog>
    </>
  )
}
