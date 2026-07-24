import { Link } from 'react-router-dom'
import { ListingHubStatusDot } from '../../landlord/listingHub/ListingHubVisuals'
import type { ListingHubSectionStatus } from '../../../lib/listingEditHubHealth'
import { ProfileSectionIcon, type ProfileSectionIconKind } from '../profile/profileSectionIcons'

type Props = {
  title: string
  subtitleLines: string[]
  status: ListingHubSectionStatus
  href: string
  icon: ProfileSectionIconKind
  disabled?: boolean
}

/** Same Listing Health hub row chrome as landlord profile hub. */
export default function RenterProfileSectionRow({
  title,
  subtitleLines,
  status,
  href,
  icon,
  disabled = false,
}: Props) {
  const multiLine = subtitleLines.length > 1
  const className = [
    'flex w-full gap-2.5 rounded-[13px] border border-[var(--quni-line)] bg-white px-[11px] py-[7px] text-left shadow-[0_1px_2px_rgba(8,6,13,0.04)] transition-colors',
    multiLine ? 'items-start' : 'items-center',
    disabled
      ? 'cursor-not-allowed opacity-60'
      : 'hover:bg-[var(--quni-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--quni-coral)]',
  ].join(' ')

  const body = (
    <>
      <span
        className={[
          'inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[var(--quni-surface-3)] text-[var(--quni-ink-3)]',
          multiLine ? 'mt-0.5' : '',
        ].join(' ')}
      >
        <ProfileSectionIcon kind={icon} size={20} />
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
    </>
  )

  if (disabled) {
    return (
      <div className={className} aria-disabled="true">
        {body}
      </div>
    )
  }

  return (
    <Link to={href} className={className}>
      {body}
    </Link>
  )
}
