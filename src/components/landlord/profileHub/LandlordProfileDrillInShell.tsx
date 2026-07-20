import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { landlordDashboardProfilePath } from '../../../lib/landlordDashboardProfilePaths'
import { ProfileHubSectionIcon } from './ProfileHubSectionIcon'
import {
  LANDLORD_PROFILE_HUB_SECTION_TITLES,
  type LandlordProfileHubSectionId,
} from './profileHubSections'

type Props = {
  sectionId: LandlordProfileHubSectionId
  error: string | null
  children: ReactNode
}

/**
 * Profile section edit — outer layout matches ListingBasicInfoDrillIn
 * (task header + scroll body on page bg). The section card sits on that bg
 * with no extra enclosing panel.
 * Cancel · Save live in AppActionBar (page-actions).
 */
export default function LandlordProfileDrillInShell({ sectionId, error, children }: Props) {
  const title = LANDLORD_PROFILE_HUB_SECTION_TITLES[sectionId]
  const hubHref = landlordDashboardProfilePath()

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--quni-surface-2)]">
      <div className="shrink-0 border-b border-[var(--quni-line-soft)] bg-white px-4 py-3">
        <Link
          to={hubHref}
          className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--quni-ink-4)] hover:text-[var(--quni-ink)]"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Profile
        </Link>
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-[var(--quni-ink)]">{title}</h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {error ? (
          <div
            className="mb-4 rounded-xl border border-[var(--quni-danger-bg)] bg-[var(--quni-danger-bg)] px-3 py-2 text-sm text-[var(--quni-danger-fg)]"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="rounded-2xl border border-[var(--quni-line)] bg-white p-4 shadow-[0_1px_2px_rgba(8,6,13,0.05)]">
          <div className="mb-[18px] flex items-center gap-2.5">
            <span className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[var(--quni-surface-3)] text-[var(--quni-ink-3)]">
              <ProfileHubSectionIcon id={sectionId} />
            </span>
            <span className="text-base font-bold text-[var(--quni-ink)]">{title}</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
