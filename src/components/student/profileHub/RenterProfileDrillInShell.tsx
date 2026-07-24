import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { renterProfilePath } from '../../../lib/renterProfilePaths'
import { ProfileSectionIcon, type ProfileSectionIconKind } from '../profile/profileSectionIcons'

type Props = {
  title: string
  icon: ProfileSectionIconKind
  error?: string | null
  children: ReactNode
}

/** Profile section drill-in — matches landlord hub shell (back + title + card). */
export default function RenterProfileDrillInShell({ title, icon, error = null, children }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-[var(--quni-line-soft)] bg-white px-4 py-3 max-sm:-mx-3.5 sm:rounded-t-[var(--radius-md)]">
        <Link
          to={renterProfilePath()}
          className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--quni-ink-4)] hover:text-[var(--quni-ink)]"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Profile
        </Link>
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-[var(--quni-ink)]">{title}</h1>
      </div>

      <div className="min-h-0 flex-1 py-5">
        {error ? (
          <div
            className="mb-4 rounded-xl border border-[var(--quni-danger-bg)] bg-[var(--quni-danger-bg)] px-3 py-2 text-sm text-[var(--quni-danger-fg)]"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="quni-card p-4">
          <div className="mb-[18px] flex items-center gap-2.5">
            <span className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[var(--quni-surface-3)] text-[var(--quni-ink-3)]">
              <ProfileSectionIcon kind={icon} size={20} />
            </span>
            <span className="text-base font-bold text-[var(--quni-ink)]">{title}</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
