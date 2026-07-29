import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Signup from '../../pages/Signup'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const SWIPE_CLOSE_PX = 80

type ListYourRoomDMobileSignupProps = {
  open: boolean
  onOpen: () => void
  onClose: () => void
}

/**
 * Mobile-only sticky CTA + bottom sheet for `/list-your-room-d`.
 * Reuses the landlord Signup embed. Desktop rail is unchanged.
 *
 * No shared Sheet primitive exists (DeskDrawer expands in-place); portal pattern
 * matches Booking bottom sheet + LegalDocumentModal focus trap.
 */
export default function ListYourRoomDMobileSignup({ open, onOpen, onClose }: ListYourRoomDMobileSignupProps) {
  const ctaButtonRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const wasOpenRef = useRef(false)
  const [entered, setEntered] = useState(false)
  const dragStartY = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (!open) {
      setEntered(false)
      return
    }
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      const primary = sheetRef.current?.querySelector<HTMLElement>('[data-invite-primary-cta="true"]')
      primary?.focus()
    }, 120)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const root = sheetRef.current
    if (!root) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const focusable = Array.from(root!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true
      return
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false
      ctaButtonRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const body = bodyRef.current
    if (!body) return

    function onFocusIn(e: FocusEvent) {
      const target = e.target
      if (!(target instanceof HTMLElement)) return
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT') return
      window.setTimeout(() => {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 50)
    }

    body.addEventListener('focusin', onFocusIn)
    return () => body.removeEventListener('focusin', onFocusIn)
  }, [open])

  function onHandleTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0]?.clientY ?? null
  }

  function onHandleTouchEnd(e: React.TouchEvent) {
    const start = dragStartY.current
    dragStartY.current = null
    if (start == null) return
    const y = e.changedTouches[0]?.clientY ?? start
    if (y - start >= SWIPE_CLOSE_PX) onClose()
  }

  const feeLine = (
    <div className="mt-3.5 mb-0 flex items-center justify-between gap-2.5 border-y border-[var(--quni-line)] py-3">
      <span className="text-[length:var(--text-caption-size)] text-[var(--quni-ink-3)]">
        <strong className="font-semibold text-[var(--quni-ink)]">Listing fee</strong> · one-off, on accept. No
        subscription.
      </span>
      <span className="shrink-0 font-sans text-[length:var(--text-h3-size)] font-bold tabular-nums text-[var(--quni-ink)]">
        $99.00
      </span>
    </div>
  )

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-[55] flex items-center gap-3 border-t border-white/15 bg-[var(--quni-ink)] px-4 pt-3 text-white pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
        role="region"
        aria-label="List your property"
      >
        <div className="min-w-0 flex-1 leading-snug">
          <button type="button" onClick={onOpen} className="w-full text-left">
            <p className="text-[length:var(--text-body-sm-size)] font-bold text-white">$99 only when someone moves in</p>
            <p className="mt-0.5 text-[length:var(--text-micro-size)] text-white/60">Free to list · verified students</p>
          </button>
        </div>
        <button
          ref={ctaButtonRef}
          type="button"
          onClick={onOpen}
          className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--quni-coral)] px-4 py-3 text-[length:var(--text-body-sm-size)] font-bold text-white transition-colors duration-[var(--dur-base)] ease-[var(--ease-standard)] hover:bg-[var(--quni-coral-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          List my property →
        </button>
      </div>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[70]" role="presentation">
              <button
                type="button"
                className={[
                  'absolute inset-0 bg-[var(--quni-ink)]/50 transition-opacity duration-[var(--dur-slow)] ease-[var(--ease-standard)]',
                  entered ? 'opacity-100' : 'opacity-0',
                ].join(' ')}
                aria-label="Close signup"
                onClick={onClose}
              />

              <div
                ref={sheetRef}
                role="dialog"
                aria-modal="true"
                aria-label="List your property"
                className={[
                  'absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-[var(--radius-lg)] border border-b-0 border-[var(--quni-line)] bg-[var(--quni-surface-1)] shadow-[var(--shadow-3)] transition-transform duration-[var(--dur-slow)] ease-[var(--ease-standard)]',
                  entered ? 'translate-y-0' : 'translate-y-full',
                ].join(' ')}
              >
                <div
                  className="relative flex shrink-0 flex-col items-center pt-2.5"
                  onTouchStart={onHandleTouchStart}
                  onTouchEnd={onHandleTouchEnd}
                  onTouchCancel={() => {
                    dragStartY.current = null
                  }}
                >
                  <button
                    type="button"
                    className="flex w-full flex-col items-center pb-1 pt-0.5"
                    aria-label="Close signup sheet"
                    onClick={onClose}
                  >
                    <span className="h-1 w-10 rounded-[var(--radius-pill)] bg-[var(--quni-line)]" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-3.5 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--quni-line)] bg-[var(--quni-surface-2)] text-[var(--quni-ink-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
                    aria-label="Close"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>

                <div
                  ref={bodyRef}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-2"
                >
                  <Signup
                    embedLandlordInvite
                    embedInviteEyebrow="For landlords"
                    embedInviteTitle="List your property"
                    embedInviteSub={feeLine}
                    embedConsentAfterForm
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
