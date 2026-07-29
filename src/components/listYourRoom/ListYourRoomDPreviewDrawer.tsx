import { useEffect, useState, type RefObject } from 'react'
import { ListingAccommodationStats } from '../ListingAccommodationStats'
import { PropertyCard } from '../PropertyCard'
import { VerifiedLandlordBadge } from '../VerifiedLandlordBadge'
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
  onClose: () => void
  onModeChange: (mode: ListYourRoomDPreviewMode) => void
}

type PreviewRailProps = {
  onOpen: (opener: HTMLElement) => void
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function LeftArrowIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  )
}

function TrustTick() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-[var(--quni-trust)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

export function ListYourRoomDPreviewRail({ onOpen }: PreviewRailProps) {
  const openFromControl = (control: HTMLElement) => onOpen(control)

  return (
    <aside className="hidden w-12 shrink-0 self-stretch sm:block" aria-label="Property preview">
      <div className="lyrd-preview-height group sticky top-4 z-50 flex w-12 flex-col items-center justify-between rounded-[var(--radius-sm)] bg-[var(--quni-ink)] py-4 text-white shadow-[var(--shadow-2)] transition-all duration-[var(--dur-base)] ease-[var(--ease-standard)] hover:-translate-x-1 hover:bg-[var(--quni-ink-2)]">
        <button
          type="button"
          onClick={(event) => openFromControl(event.currentTarget)}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--quni-coral)] text-white transition-colors duration-[var(--dur-base)] ease-[var(--ease-standard)] hover:bg-[var(--quni-coral-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Slide out property preview"
        >
          <LeftArrowIcon />
        </button>
        <button
          type="button"
          onClick={(event) => openFromControl(event.currentTarget)}
          className="flex min-h-0 flex-1 items-center justify-center px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Preview your room — slide out"
        >
          <span className="-rotate-90 whitespace-nowrap text-sm font-semibold tracking-wide">Preview your room</span>
        </button>
        <button
          type="button"
          onClick={(event) => openFromControl(event.currentTarget)}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--quni-coral)] text-white transition-colors duration-[var(--dur-base)] ease-[var(--ease-standard)] hover:bg-[var(--quni-coral-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Slide out property preview"
        >
          <LeftArrowIcon />
        </button>
      </div>
    </aside>
  )
}

function FullPropertyPreview({ property }: { property: Property }) {
  const images = normalizePropertyImages(property.images).map((image) => image.url)
  const rent = getListingRentDisplay(property)
  const accommodation = formatListingDetailAccommodation(property)
  const hostName = property.landlord_profiles?.full_name?.trim() || 'Private landlord'
  const hostAvatar = property.landlord_profiles?.avatar_url?.trim()
  const featureNames = (property.property_features ?? [])
    .map((row) => row.features?.name?.trim())
    .filter((name): name is string => Boolean(name))
    .slice(0, 8)
  const houseRuleRows = property.property_house_rules ?? []
  const aboutSummary = property.description
    ?.trim()
    .replace(/\s+/g, ' ')

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="aspect-video overflow-hidden rounded-[var(--radius-sm)] border border-[var(--quni-line)] bg-[var(--quni-surface-2)]">
          {images[0] ? <img src={images[0]} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[images[1], images[2], images[3], images[4]].map((src, index) => (
            <div
              key={src ?? index}
              className="aspect-video overflow-hidden rounded-[var(--radius-sm)] border border-[var(--quni-line)] bg-[var(--quni-surface-2)]"
            >
              {src ? <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-5 sm:grid-cols-2">
        <div className="space-y-4">
          <div>
            <h3 className="font-display text-2xl font-semibold text-[var(--quni-ink)]">{property.title}</h3>
            <p className="mt-1 text-sm text-[var(--quni-ink-3)]">
              {[property.suburb, property.state].filter(Boolean).join(', ')}
              {accommodation ? ` · ${accommodation}` : null}
            </p>
          </div>

          <div className="flex items-center gap-3 border-y border-[var(--quni-line)] py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--quni-line)] bg-[var(--quni-surface-2)] text-sm font-semibold text-[var(--quni-ink-3)]">
              {hostAvatar ? <img src={hostAvatar} alt="" className="h-full w-full object-cover" /> : hostName.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--quni-ink)]">Hosted by {hostName}</p>
              <p className="text-xs text-[var(--quni-ink-3)]">Usually replies within a few hours</p>
            </div>
            {property.landlord_profiles?.verified ? <VerifiedLandlordBadge className="ml-auto" /> : null}
          </div>

          <ListingAccommodationStats
            property={property}
            roomLabel={typeof property.room_type === 'string' ? property.room_type : null}
            variant="compact"
          />

          {rent ? (
            <p className="text-2xl font-bold tabular-nums text-[var(--quni-ink)]">
              {rent.showFromPrefix ? 'From ' : ''}$
              {rent.primaryAmount.toLocaleString('en-AU', { maximumFractionDigits: 0 })}
              <span className="ml-1 text-sm font-medium text-[var(--quni-ink-3)]">/wk</span>
            </p>
          ) : null}
        </div>

        <div className="space-y-5">
          <section aria-labelledby="lyrd-preview-included">
            <h4
              id="lyrd-preview-included"
              className="text-xs font-semibold uppercase tracking-wide text-[var(--quni-ink-3)]"
            >
              What&apos;s included
            </h4>
            {featureNames.length > 0 ? (
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {featureNames.map((name) => (
                  <li
                    key={name}
                    className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--quni-line)] bg-[var(--quni-surface-2)] px-3 py-2 text-sm text-[var(--quni-ink-2)]"
                  >
                    <TrustTick />
                    {name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[var(--quni-ink-3)]">Included features appear with the live listing.</p>
            )}
          </section>

          {aboutSummary ? (
            <section className="border-t border-[var(--quni-line)] pt-4" aria-labelledby="lyrd-preview-about">
              <h4
                id="lyrd-preview-about"
                className="text-xs font-semibold uppercase tracking-wide text-[var(--quni-ink-3)]"
              >
                About this room
              </h4>
              <p className="mt-2 line-clamp-6 text-sm leading-relaxed text-[var(--quni-ink-2)]">{aboutSummary}</p>
            </section>
          ) : null}

          {houseRuleRows.length > 0 ? (
            <section className="border-t border-[var(--quni-line)] pt-4" aria-labelledby="lyrd-preview-rules">
              <h4
                id="lyrd-preview-rules"
                className="text-xs font-semibold uppercase tracking-wide text-[var(--quni-ink-3)]"
              >
                House rules
              </h4>
              <ul className="mt-2 flex flex-wrap gap-2">
                {houseRuleRows.map((row) => (
                  <li
                    key={row.rule_id}
                    className="rounded-[var(--radius-sm)] border border-[var(--quni-line)] bg-[var(--quni-surface-2)] px-3 py-2 text-xs text-[var(--quni-ink-2)]"
                  >
                    {row.house_rules_ref?.name?.trim() || 'House rule'} — {row.permitted}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <p className="border-t border-[var(--quni-line)] pt-4 text-sm text-[var(--quni-ink-3)]">
        The structured page a student opens before they ask to book, using the live property data.
      </p>
    </div>
  )
}

export default function ListYourRoomDPreviewDrawer({
  open,
  mode,
  property,
  isMobile,
  dialogRef,
  onClose,
  onModeChange,
}: ListYourRoomDPreviewDrawerProps) {
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
      const frame = requestAnimationFrame(() => setEntered(true))
      return () => cancelAnimationFrame(frame)
    }
    if (dialog.open) dialog.close()
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
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-[var(--quni-ink)] backdrop:bg-[var(--quni-ink)]/60"
    >
      <div
        className="relative mx-auto h-dvh max-w-site"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className={[
            'lyrd-preview-height absolute right-5 top-4 z-20 hidden overflow-hidden rounded-[var(--radius-sm)] bg-[var(--quni-ink)] py-4 text-white shadow-[var(--shadow-2)] transition-all duration-[var(--dur-slow)] ease-[var(--ease-standard)] sm:flex sm:flex-col sm:items-center sm:justify-between',
            entered ? 'w-1.5' : 'w-12',
          ].join(' ')}
          aria-label="Retract property preview"
        >
          <span
            className={[
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--quni-coral)] transition-opacity duration-[var(--dur-base)]',
              entered ? 'opacity-0' : 'opacity-100',
            ].join(' ')}
            aria-hidden
          >
            <LeftArrowIcon />
          </span>
          <span
            className={[
              '-rotate-90 whitespace-nowrap text-sm font-semibold tracking-wide transition-opacity duration-[var(--dur-base)]',
              entered ? 'opacity-0' : 'opacity-100',
            ].join(' ')}
            aria-hidden
          >
            Preview your room
          </span>
          <span
            className={[
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--quni-coral)] transition-opacity duration-[var(--dur-base)]',
              entered ? 'opacity-0' : 'opacity-100',
            ].join(' ')}
            aria-hidden
          >
            <LeftArrowIcon />
          </span>
        </button>
        <section
          className={[
            'lyrd-preview-height absolute right-0 top-0 flex w-full flex-col overflow-hidden border border-[var(--quni-line)] bg-[var(--quni-surface-1)] shadow-[var(--shadow-3)] transition-all duration-[var(--dur-slow)] ease-[var(--ease-standard)] sm:right-5 sm:top-4 sm:rounded-[var(--radius-sm)]',
            entered
              ? 'translate-x-0 translate-y-0'
              : isMobile
                ? 'translate-y-full'
                : 'translate-x-full',
            mode === 'listing' ? 'sm:max-w-md' : 'sm:max-w-4xl',
          ].join(' ')}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="shrink-0 border-b border-[var(--quni-line)] px-5 pb-4 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="mx-auto flex w-full justify-center py-1 sm:hidden"
              aria-label="Close preview drawer"
            >
              <span className="h-1 w-10 rounded-[var(--radius-pill)] bg-[var(--quni-line)]" aria-hidden />
            </button>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-[var(--quni-ink)]">Preview your room</h2>
                <p className="mt-1 text-xs text-[var(--quni-ink-3)]">
                  Exactly how your room appears the day it goes live.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--quni-line)] bg-[var(--quni-surface-2)] text-[var(--quni-ink-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>
            <div
              className="mt-3 inline-flex rounded-[var(--radius-sm)] border border-[var(--quni-line)] bg-[var(--quni-surface-2)] p-1"
              role="tablist"
              aria-label="Preview mode"
            >
              {(['listing', 'full'] as const).map((nextMode, index) => (
                <button
                  key={nextMode}
                  type="button"
                  role="tab"
                  data-preview-first-control={index === 0 ? 'true' : undefined}
                  aria-selected={mode === nextMode}
                  onClick={() => onModeChange(nextMode)}
                  className={[
                    'rounded-[var(--radius-sm)] px-3 py-2 text-sm font-semibold transition-colors duration-[var(--dur-base)] ease-[var(--ease-standard)]',
                    mode === nextMode
                      ? 'bg-[var(--quni-surface-1)] text-[var(--quni-ink)] shadow-[var(--shadow-1)]'
                      : 'text-[var(--quni-ink-3)] hover:text-[var(--quni-ink)]',
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
                <p className="mt-4 text-sm leading-relaxed text-[var(--quni-ink-3)]">
                  The exact card a verified student sees while browsing — the same live component used by every
                  listing.
                </p>
              </div>
            ) : (
              <FullPropertyPreview property={property} />
            )}
          </div>
        </section>
      </div>
    </dialog>
  )
}
