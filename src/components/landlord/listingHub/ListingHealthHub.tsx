import { Link } from 'react-router-dom'
import { Eye } from 'lucide-react'
import {
  LISTING_HUB_SECTIONS,
  listingHubPath,
  type ListingHubHealthResult,
  type ListingHubSectionId,
} from '../../../lib/listingEditHubHealth'
import {
  ListingHubQualityRing,
  ListingHubSectionIcon,
  ListingHubStatusDot,
} from './ListingHubVisuals'

type Props = {
  propertyId: string | null
  listingName: string
  thumbUrl: string | null
  statusLabel: 'Active' | 'Draft' | 'Inactive' | 'Pending' | 'Suspended'
  health: ListingHubHealthResult
  /** Public listing URL when live — otherwise Preview is disabled. */
  previewHref?: string | null
}

/**
 * Listing health hub — identity row + section checklist.
 * Mobile actions (‹ Listings · Health · Preview) live in AppActionBar.
 * Desktop Preview stays in-page (max-sm:hidden).
 */
export default function ListingHealthHub({
  propertyId,
  listingName,
  thumbUrl,
  statusLabel,
  health,
  previewHref = null,
}: Props) {
  const isSetup = health.isSetupMode
  const statusBadgeClass =
    statusLabel === 'Active'
      ? 'border-[rgba(29,158,117,0.32)] bg-[var(--quni-success-bg)] text-[var(--quni-success-strong)]'
      : 'border-[#E1DDD2] bg-[var(--quni-surface-3)] text-[var(--quni-ink-4)]'

  function sectionHref(id: ListingHubSectionId) {
    if (id === 'basic') return listingHubPath({ propertyId, view: 'basic' })
    return listingHubPath({ propertyId, view: id })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--quni-surface-2)]">
      {/* Identity */}
      <div className="shrink-0 border-b border-[var(--quni-line-soft)] bg-white">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 sm:px-4">
          <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-[9px] bg-[var(--quni-surface-3)]">
            {thumbUrl ? (
              <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </span>
          <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-[var(--quni-ink)]">
            {listingName}
          </p>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${statusBadgeClass}`}
          >
            {statusLabel}
          </span>
          {previewHref ? (
            <Link
              to={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--quni-line)] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[var(--quni-ink-3)] hover:border-[var(--quni-coral)] hover:text-[var(--quni-coral)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
            >
              <Eye className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Preview
            </Link>
          ) : (
            <span
              className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--quni-line-soft)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--quni-ink-5)]"
              title="Publish the listing to preview the public page"
            >
              <Eye className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Preview
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3 sm:px-4">
        <div className="mb-2.5 flex items-center gap-3 rounded-2xl border border-[var(--quni-line)] bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(8,6,13,0.05)]">
          <ListingHubQualityRing score={health.score} />
          <div className="min-w-0">
            <p
              className={`mb-1 text-[15.5px] font-bold leading-tight ${
                health.score >= 100 ? 'text-[var(--quni-success-strong)]' : 'text-[var(--quni-ink)]'
              }`}
            >
              {health.qualityHeadline}
            </p>
            <p
              className={`text-[12.5px] leading-snug text-pretty ${
                health.score >= 100
                  ? 'text-[var(--quni-success-fg)]'
                  : 'text-[var(--quni-ink-4)]'
              }`}
            >
              {health.qualitySubtext}
            </p>
          </div>
        </div>

        {isSetup ? (
          <div className="mb-3.5 flex items-start gap-2.5 rounded-xl border border-[var(--quni-cream-border)] bg-[var(--quni-cream)] px-3.5 py-3">
            <span className="mt-0.5 shrink-0 text-[var(--quni-warning)]" aria-hidden>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
                <path d="M12 8v5" />
                <path d="M12 16h.01" />
              </svg>
            </span>
            <p className="text-[12.5px] leading-snug text-[#5C5326]">
              We&apos;ll walk you through each section in order. Your progress saves as you go.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          {LISTING_HUB_SECTIONS.map((s) => {
            const status = health.statuses[s.id]
            return (
              <Link
                key={s.id}
                to={sectionHref(s.id)}
                className="flex w-full items-center gap-2.5 rounded-[13px] border border-[var(--quni-line)] bg-white px-[11px] py-[7px] text-left shadow-[0_1px_2px_rgba(8,6,13,0.04)] transition-colors hover:bg-[var(--quni-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]"
              >
                <span className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[var(--quni-surface-3)] text-[var(--quni-ink-3)]">
                  <ListingHubSectionIcon id={s.id} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold text-[var(--quni-ink)]">{s.title}</span>
                    {s.aiTag === 'writer' ? (
                      <span className="rounded-full border border-[var(--quni-ai-border)] bg-[var(--quni-ai-tint)] px-1.5 py-px text-[9.5px] font-semibold text-[var(--quni-ai)]">
                        ✦ AI writer
                      </span>
                    ) : null}
                    {s.aiTag === 'price' ? (
                      <span className="rounded-full border border-[var(--quni-ai-border)] bg-[var(--quni-ai-tint)] px-1.5 py-px text-[9.5px] font-semibold text-[var(--quni-ai)]">
                        ✦ AI price
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-px block truncate text-[11.5px] text-[var(--quni-ink-5)]">
                    {s.subtitle}
                  </span>
                </span>
                <ListingHubStatusDot status={status} />
                <span className="shrink-0 text-[var(--quni-line)]" aria-hidden>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
