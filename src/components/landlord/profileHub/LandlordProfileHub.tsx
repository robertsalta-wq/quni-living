import { useState, type ReactNode } from 'react'
import { ProfileReadinessDriver } from '../../profile'
import { landlordDashboardProfilePath } from '../../../lib/landlordDashboardProfilePaths'
import {
  buildLandlordReadinessDriverContent,
  type LandlordReadiness,
} from '../../../lib/landlordProfileReadiness'
import type { LandlordListingBillingSnapshot } from '../../../lib/landlordListingBilling'
import LandlordProfileSectionRow from './LandlordProfileSectionRow'
import {
  LANDLORD_PROFILE_HUB_SECTION_IDS,
  LANDLORD_PROFILE_HUB_SECTION_TITLES,
  profileHubSectionStatus,
  profileHubSubtitleLines,
  type LandlordProfileRow,
} from './profileHubSections'

type Props = {
  profile: LandlordProfileRow
  email: string | null
  listingBilling: LandlordListingBillingSnapshot | null
  readiness: LandlordReadiness
  driverLine: ReactNode
  onSignOut: () => void
  onDeleteAccount: () => void
}

/**
 * Mobile Profile hub — Listing Health checklist chrome; subtitles show live values.
 */
export default function LandlordProfileHub({
  profile,
  email,
  listingBilling,
  readiness,
  driverLine,
  onSignOut,
  onDeleteAccount,
}: Props) {
  const driverContent = buildLandlordReadinessDriverContent(readiness)
  const fullySetUp = readiness.phase === 'complete'
  const [setupExpanded, setSetupExpanded] = useState(false)

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--quni-surface-2)]">
      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3 sm:px-4">
        {fullySetUp ? (
          <div className="mb-5 overflow-hidden rounded-[14px] border border-[rgba(29,158,117,0.30)] bg-[var(--quni-success-bg)]">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-[15px] py-[13px] text-left"
              aria-expanded={setupExpanded}
              onClick={() => setSetupExpanded((v) => !v)}
            >
              <span className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[var(--quni-success)] text-white">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M4 12.5l5 5L20 6"
                    stroke="#fff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-[var(--quni-success-strong)]">
                  You&apos;re all set up
                </span>
                <span className="mt-px block text-[12.5px] text-[var(--quni-success-strong)] opacity-85">
                  Listing &amp; bookings enabled
                </span>
              </span>
              <span
                className={`shrink-0 text-[var(--quni-success-strong)] transition-transform ${
                  setupExpanded ? 'rotate-180' : ''
                }`}
                aria-hidden
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>
            {setupExpanded ? (
              <div className="border-t border-[rgba(29,158,117,0.25)] px-[15px] py-3 text-[13px] leading-snug text-[var(--quni-success-fg)]">
                {driverLine}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mb-5">
            <ProfileReadinessDriver
              eyebrow={driverContent.eyebrow}
              title={driverContent.title}
              fraction={driverContent.fraction}
              fractionLabel={driverContent.fractionLabel}
              steps={driverContent.steps}
              progress={driverContent.progress}
              tone={driverContent.tone}
              line={driverLine}
            />
          </div>
        )}

        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--quni-ink-5)]">
          Your profile
        </p>

        <div className="flex flex-col gap-1.5">
          {LANDLORD_PROFILE_HUB_SECTION_IDS.map((id) => (
            <LandlordProfileSectionRow
              key={id}
              id={id}
              title={LANDLORD_PROFILE_HUB_SECTION_TITLES[id]}
              subtitleLines={profileHubSubtitleLines(id, profile, { email, listingBilling })}
              status={profileHubSectionStatus(id, profile)}
              href={landlordDashboardProfilePath(id)}
            />
          ))}
        </div>

        <div className="mt-[22px] flex items-center justify-center gap-2.5 text-[13px]">
          <button
            type="button"
            onClick={onSignOut}
            className="font-medium text-[var(--quni-ink-4)] hover:text-[var(--quni-coral-active)] hover:underline"
          >
            Sign out
          </button>
          <span className="text-[#C4BFCB]" aria-hidden>
            ·
          </span>
          <button
            type="button"
            onClick={onDeleteAccount}
            className="font-medium text-[var(--quni-ink-4)] hover:text-[var(--quni-coral-active)] hover:underline"
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  )
}
