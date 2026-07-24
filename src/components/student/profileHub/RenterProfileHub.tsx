import { useState, type ReactNode } from 'react'
import { RenterProfileReadinessDriver } from '../profile/RenterProfileReadinessDriver'
import type { RenterReadiness } from '../../../lib/renterReadiness'
import type { Database } from '../../../lib/database.types'
import type { RenterSituation } from '../../../lib/renterSituation'
import { renterProfilePath } from '../../../lib/renterProfilePaths'
import RenterProfileSectionRow from './RenterProfileSectionRow'
import {
  RENTER_PROFILE_HUB_SECTION_IDS,
  renterProfileHubIcon,
  renterProfileHubSectionStatus,
  renterProfileHubSubtitleLines,
  renterProfileHubTitle,
  type RenterHubCompleteness,
} from './renterProfileHubSections'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

type Props = {
  profile: StudentRow
  readiness: RenterReadiness
  situation: RenterSituation | null
  verificationComplete: boolean
  completeness: RenterHubCompleteness
  verificationSummaryText?: string
  onSignOut: () => void
  onDeleteAccount: () => void
  children?: ReactNode
}

export default function RenterProfileHub({
  profile,
  readiness,
  situation,
  verificationComplete,
  completeness,
  verificationSummaryText,
  onSignOut,
  onDeleteAccount,
}: Props) {
  const fullySetUp =
    Boolean(situation) &&
    completeness.personalComplete &&
    completeness.verificationComplete &&
    completeness.routeComplete &&
    (!completeness.showGuarantor || completeness.guarantorComplete) &&
    completeness.emergencyComplete

  const [setupExpanded, setSetupExpanded] = useState(false)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1">
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
                  Ready to apply
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
                Profile complete — you can apply for listings.
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mb-5">
            <RenterProfileReadinessDriver
              readiness={readiness}
              profile={profile}
              situation={situation}
              verificationComplete={verificationComplete}
            />
          </div>
        )}

        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--quni-ink-5)]">
          Your profile
        </p>

        <div className="flex flex-col gap-1.5">
          {RENTER_PROFILE_HUB_SECTION_IDS.map((id) => {
            const lockedRoute = id === 'route' && !situation
            return (
              <RenterProfileSectionRow
                key={id}
                title={renterProfileHubTitle(id, situation)}
                subtitleLines={renterProfileHubSubtitleLines(
                  id,
                  profile,
                  completeness,
                  verificationSummaryText,
                )}
                status={renterProfileHubSectionStatus(id, completeness)}
                href={lockedRoute ? renterProfilePath('situation') : renterProfilePath(id)}
                icon={renterProfileHubIcon(id, situation)}
              />
            )
          })}
        </div>

        <div className="mt-[22px] flex items-center justify-center gap-2.5 text-[13px]">
          <button
            type="button"
            onClick={onSignOut}
            className="font-medium text-[var(--quni-ink-4)] hover:text-[var(--quni-coral-active)] hover:underline"
          >
            Sign out
          </button>
          <span className="text-[var(--quni-line)]" aria-hidden>
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
