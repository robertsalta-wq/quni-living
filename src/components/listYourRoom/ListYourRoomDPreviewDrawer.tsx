import { useEffect, useState, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { ListingAccommodationStats } from '../ListingAccommodationStats'
import { PropertyCard } from '../PropertyCard'
import type { Property } from '../../lib/listings'
import { formatListingDetailAccommodation } from '../../lib/listingAccommodationDisplay'
import { getListingRentDisplay } from '../../lib/pricing/listingRentDisplay'
import { normalizePropertyImages } from '../../lib/propertyImages'

export type ListYourRoomDPreviewMode = 'listing' | 'full'

type ListYourRoomDPreviewDrawerProps = {
  open: boolean
  mode: ListYourRoomDPreviewMode
  property: Property | null
  isMobile: boolean
  dialogRef: RefObject<HTMLDialogElement | null>
  onOpen: (opener: HTMLElement) => void
  onClose: () => void
  onModeChange: (mode: ListYourRoomDPreviewMode) => void
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function FullPropertyPreview({ property }: { property: Property }) {
  const images = normalizePropertyImages(property.images).map((image) => image.url)
  const rent = getListingRentDisplay(property)
  const accommodation = formatListingDetailAccommodation(property)
  const houseRuleRows = property.property_house_rules ?? []
  const writtenRules = property.house_rules?.trim()

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="aspect-video overflow-hidden rounded-[var(--radius-md)] border border-[var(--quni-line)] bg-[var(--quni-surface-2)]">
          {images[0] ? <img src={images[0]} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[images[1], images[2], images[3], images[4]].map((src, index) => (
            <div
              key={src ?? index}
              className="aspect-video overflow-hidden rounded-[var(--radius-md)] border border-[var(--quni-line)] bg-[var(--quni-surface-2)]"
            >
              {src ? <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-2xl font-semibold text-[var(--quni-ink)]">{property.title}</h3>
            <p className="mt-1 text-sm text-[var(--quni-ink-3)]">
              {[property.suburb, property.state].filter(Boolean).join(', ')}
              {accommodation ? ` · ${accommodation}` : null}
            </p>
          </div>
          <ListingAccommodationStats
            property={property}
            roomLabel={typeof property.room_type === 'string' ? property.room_type : null}
            variant="compact"
          />
          {property.description?.trim() ? (
            <section className="border-t border-[var(--quni-line)] pt-4" aria-labelledby="lyrd-preview-about">
              <h4 id="lyrd-preview-about" className="font-display text-lg font-semibold text-[var(--quni-ink)]">
                About this place
              </h4>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--quni-ink-3)]">
                {property.description.trim()}
              </p>
            </section>
          ) : null}
        </div>

        <div className="space-y-4">
          <aside className="rounded-[var(--radius-md)] border border-[var(--quni-ink)] bg-[var(--quni-surface-1)] p-4">
            {rent ? (
              <p className="text-2xl font-bold tabular-nums text-[var(--quni-ink)]">
                {rent.showFromPrefix ? 'From ' : ''}$
                {rent.primaryAmount.toLocaleString('en-AU', { maximumFractionDigits: 0 })}
                <span className="ml-1 text-sm font-medium text-[var(--quni-ink-3)]">/wk</span>
              </p>
            ) : null}
            <p className="mt-2 text-sm text-[var(--quni-ink-3)]">Read-only preview — booking is disabled here.</p>
          </aside>

          {houseRuleRows.length > 0 || writtenRules ? (
            <section className="border-t border-[var(--quni-line)] pt-4" aria-labelledby="lyrd-preview-rules">
              <h4 id="lyrd-preview-rules" className="font-display text-lg font-semibold text-[var(--quni-ink)]">
                House rules
              </h4>
              {houseRuleRows.length > 0 ? (
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {houseRuleRows.map((row) => (
                    <li
                      key={row.rule_id}
                      className="rounded-[var(--radius-sm)] border border-[var(--quni-line)] bg-[var(--quni-surface-2)] px-3 py-2 text-sm text-[var(--quni-ink-3)]"
                    >
                      {row.house_rules_ref?.name?.trim() || 'House rule'} — {row.permitted}
                    </li>
                  ))}
                </ul>
              ) : null}
              {writtenRules ? (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--quni-ink-3)]">
                  {writtenRules}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>

      <p className="border-t border-[var(--quni-line)] pt-4 text-sm text-[var(--quni-ink-3)]">
        This uses the live property data.{' '}
        <Link
          to={`/properties/${property.slug}`}
          className="font-semibold text-[var(--quni-coral-active)] underline-offset-2 hover:underline"
        >
          Open the complete property page
        </Link>
        .
      </p>
    </div>
  )
}

/** Adaptive native preview dialog plus one-time desktop edge-tab nudge. */
export default function ListYourRoomDPreviewDrawer({
  open,
  mode,
  property,
  isMobile,
  dialogRef,
  onOpen,
  onClose,
  onModeChange,
}: ListYourRoomDPreviewDrawerProps) {
  const [nudgeIterations, setNudgeIterations] = useState(0)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
      const frame = requestAnimationFrame(() => setEntered(true))
      return () => cancelAnimationFrame(frame)
    }
    if (!open && dialog.open) dialog.close()
  }, [dialogRef, open])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>('[data-preview-first-control="true"]')?.focus()
    })
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
    }
  }, [dialogRef, open])

  return (
    <>
      {!isMobile ? (
        <div className="fixed right-0 top-1/2 z-30 h-12 w-48 origin-bottom-right -rotate-90">
          <button
            type="button"
            onClick={(event) => onOpen(event.currentTarget)}
            onAnimationIteration={() => setNudgeIterations((count) => count + 1)}
            className={[
              'h-full w-full rounded-t-[var(--radius-sm)] bg-[var(--quni-ink)] px-4 text-sm font-semibold text-white shadow-[var(--shadow-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]',
              nudgeIterations < 3 ? 'animate-pulse' : '',
            ].join(' ')}
          >
            Preview your room
          </button>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Preview your room"
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
          'fixed bottom-0 right-0 top-0 m-0 h-dvh w-full max-w-none overflow-hidden border-l border-[var(--quni-line)] bg-[var(--quni-surface-1)] p-0 text-[var(--quni-ink)] shadow-[var(--shadow-3)] backdrop:bg-[var(--quni-ink)]/60',
          'transition-all duration-[var(--dur-slow)] ease-[var(--ease-standard)]',
          entered
            ? 'translate-x-0 translate-y-0'
            : isMobile
              ? 'translate-y-full'
              : 'translate-x-full',
          mode === 'listing' ? 'sm:max-w-md' : 'sm:max-w-4xl',
        ].join(' ')}
      >
        <div className="flex h-dvh flex-col">
          <header className="shrink-0 bg-[var(--quni-ink)] px-4 pb-4 pt-3 text-white">
            <button
              type="button"
              onClick={onClose}
              className="mx-auto flex w-full justify-center py-1 sm:hidden"
              aria-label="Close preview drawer"
            >
              <span className="h-1 w-10 rounded-[var(--radius-pill)] bg-white/40" aria-hidden />
            </button>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Your listing preview</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-white">Preview your room</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="mt-3 inline-flex rounded-[var(--radius-sm)] border border-white/30 p-1" role="group" aria-label="Preview mode">
              {(['listing', 'full'] as const).map((nextMode, index) => (
                <button
                  key={nextMode}
                  type="button"
                  data-preview-first-control={index === 0 ? 'true' : undefined}
                  aria-pressed={mode === nextMode}
                  onClick={() => onModeChange(nextMode)}
                  className={[
                    'rounded-[var(--radius-sm)] px-3 py-2 text-sm font-semibold transition-colors duration-[var(--dur-base)] ease-[var(--ease-standard)]',
                    mode === nextMode ? 'bg-white text-[var(--quni-ink)]' : 'text-white/70 hover:text-white',
                  ].join(' ')}
                >
                  {nextMode === 'listing' ? 'Listing' : 'Full viewing'}
                </button>
              ))}
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 [padding-bottom:max(var(--space-5),env(safe-area-inset-bottom,0px))]">
            {!property ? (
              <p className="text-sm text-[var(--quni-ink-3)]">Loading property preview…</p>
            ) : mode === 'listing' ? (
              <div className="mx-auto max-w-sm">
                <PropertyCard property={property} staticDisplay />
              </div>
            ) : (
              <FullPropertyPreview property={property} />
            )}
          </div>
        </div>
      </dialog>
    </>
  )
}
