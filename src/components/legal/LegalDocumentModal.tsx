import { type ReactNode, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

type LegalDocumentModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** When set, replaces the default legal "Last updated" line in the header. */
  subtitle?: ReactNode
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  )
}

export function LegalDocumentModal({ open, onClose, title, children, subtitle }: LegalDocumentModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

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
    closeButtonRef.current?.focus()

    const root = dialogRef.current
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

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex md:items-center md:justify-center md:p-6" role="presentation">
      <button
        type="button"
        className="absolute inset-0 hidden bg-black/50 md:block"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className="relative z-10 flex h-full w-full flex-col bg-white md:h-auto md:max-h-[min(90vh,900px)] md:max-w-3xl md:overflow-hidden md:rounded-2xl md:shadow-2xl md:ring-1 md:ring-stone-900/5"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-stone-200 bg-white px-4 py-4 sm:px-6 [padding-top:max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-xl font-bold text-[var(--quni-coral)] tracking-tight sm:text-2xl">
              {title}
            </h2>
            {subtitle !== undefined ? (
              subtitle ? <p className="mt-1 text-sm text-stone-500">{subtitle}</p> : null
            ) : (
              <p className="mt-1 text-sm text-stone-500">Last updated: 23 March 2026</p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quni-coral)] focus-visible:ring-offset-2"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 [padding-bottom:max(1.5rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export type LegalDocumentKind = 'terms' | 'privacy' | 'landlord-agreement'

const LEGAL_DOC_LINK_CLASS =
  'text-[var(--quni-coral)] font-medium underline underline-offset-2 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quni-coral)] focus-visible:ring-offset-1 rounded-sm'

type SignupLegalDocLinkProps = {
  kind: LegalDocumentKind
  onOpen: (kind: LegalDocumentKind) => void
  children: ReactNode
}

/** Button styled as a link; stops label/checkbox toggles when used inside consent labels. */
export function SignupLegalDocLink({ kind, onOpen, children }: SignupLegalDocLinkProps) {
  return (
    <button
      type="button"
      className={`relative z-[1] ${LEGAL_DOC_LINK_CLASS}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onOpen(kind)
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </button>
  )
}
