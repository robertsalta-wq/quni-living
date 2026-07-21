import { Link } from 'react-router-dom'
import { ListingHubStatusDot } from '../listingHub/ListingHubVisuals'
import type { ListingHubSectionStatus } from '../../../lib/listingEditHubHealth'
import { ProfileHubSectionIcon } from './ProfileHubSectionIcon'
import type { LandlordProfileHubSectionId } from './profileHubSections'

type Props = {
  id: LandlordProfileHubSectionId
  title: string
  /** Actual current value(s). Multi-line → top-align icon/check/chevron. */
  subtitleLines: string[]
  status: ListingHubSectionStatus
  href: string
}

/**
 * Canonical Listing Health hub row — icon tile + title + subtitle + filled-circle
 * check + chevron. Only difference: subtitle shows the member's values.
 */
export default function LandlordProfileSectionRow({ id, title, subtitleLines, status, href }: Props) {
  const multiLine = subtitleLines.length > 1
  return (
    <Link
      to={href}
      className={[
        'flex w-full gap-2.5 rounded-[13px] border border-[var(--quni-line)] bg-white px-[11px] py-[7px] text-left shadow-[0_1px_2px_rgba(8,6,13,0.04)] transition-colors hover:bg-[var(--quni-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]',
        multiLine ? 'items-start' : 'items-center',
      ].join(' ')}
    >
      <span
        className={[
          'inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[var(--quni-surface-3)] text-[var(--quni-ink-3)]',
          multiLine ? 'mt-0.5' : '',
        ].join(' ')}
      >
        <ProfileHubSectionIcon id={id} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--quni-ink)]">{title}</span>
        <span className="mt-px block text-[11.5px] leading-snug text-[var(--quni-ink-5)]">
          {subtitleLines.map((line) => (
            <span key={line} className="block truncate">
              {line}
            </span>
          ))}
        </span>
      </span>
      <span className={multiLine ? 'mt-0.5 shrink-0' : 'shrink-0'}>
        <ListingHubStatusDot status={status} />
      </span>
      <span className={['shrink-0 text-[var(--quni-line)]', multiLine ? 'mt-0.5' : ''].join(' ')} aria-hidden>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </span>
    </Link>
  )
}
