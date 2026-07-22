import { useState } from 'react'
import { Lock } from 'lucide-react'
import ReadinessProgressBar from '../../profile/ReadinessProgressBar'
import {
  computeRenterProfileDriverProgress,
  type RenterReadiness,
} from '../../../lib/renterReadiness'
import type { Database } from '../../../lib/database.types'
import type { RenterSituation } from '../../../lib/renterSituation'

type StudentRow = Database['public']['Tables']['student_profiles']['Row']

type Props = {
  readiness: RenterReadiness
  profile: StudentRow
  situation: RenterSituation | null
  verificationComplete: boolean
}

const STICKY_TOP = 'var(--quni-fixed-header-offset, 0px)'

const DRIVER_CARD = 'quni-card sticky z-[5] flex flex-col gap-[11px] px-[18px] py-4'

const COMPLETE_CARD = 'quni-card sticky z-[5] border-admin-success/35'

const COMPLETE_CARD_COLLAPSED =
  'quni-card sticky z-[5] border-admin-success/35 bg-admin-success-bg'

function CheckGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z"
      />
    </svg>
  )
}

function ChevronGlyph({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-[18px] w-[18px] shrink-0 stroke-admin-success-fg transition-transform duration-200 ${
        expanded ? 'rotate-180' : ''
      }`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function DriverBody({
  done,
  total,
  pct,
  showLock,
  driverText,
}: {
  done: number
  total: number
  pct: number
  showLock: boolean
  driverText: string
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--quni-ink-5)]">
            Complete your profile
          </div>
          <div className="mt-[5px] text-[22px] font-bold tracking-[-0.01em] text-[var(--quni-ink)]">
            Profile <span className="text-[var(--quni-coral)]">{pct}%</span> complete
          </div>
        </div>
        <div className="shrink-0 text-right text-[13px] font-semibold text-[var(--quni-ink-2)]">
          {done} of {total} required done
        </div>
      </div>
      <ReadinessProgressBar value={pct} />
      {showLock ? (
        <div className="flex items-start gap-[9px] text-[13.5px] leading-normal text-[var(--quni-ink-3)]">
          <Lock size={17} className="mt-px shrink-0 text-[var(--quni-coral)]" aria-hidden />
          <span>{driverText}</span>
        </div>
      ) : null}
    </>
  )
}

export function RenterProfileReadinessDriver({
  readiness,
  profile,
  situation,
  verificationComplete,
}: Props) {
  const { done, total, pct } = computeRenterProfileDriverProgress(profile, situation, verificationComplete)
  const complete = done === total && total > 0
  const driverText = readiness.blocksBooking[0] ?? 'Complete your profile to apply'
  const [expanded, setExpanded] = useState(false)

  if (complete) {
    return (
      <div className={expanded ? COMPLETE_CARD : COMPLETE_CARD_COLLAPSED} style={{ top: STICKY_TOP }}>
        <button
          type="button"
          className={[
            'flex w-full cursor-pointer items-center gap-3 border-0 text-left',
            expanded ? 'bg-admin-success-bg px-[18px] py-3.5' : 'bg-transparent px-[18px] py-3.5',
          ].join(' ')}
          aria-expanded={expanded}
          aria-controls="renter-profile-readiness-complete-panel"
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-admin-success text-white">
            <CheckGlyph />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-admin-success-fg">
              Profile {pct}% Complete
            </span>
            <span className="mt-0.5 block text-[12.5px] text-admin-ink-4">Ready to apply</span>
          </span>
          <ChevronGlyph expanded={expanded} />
        </button>

        {expanded ? (
          <div
            id="renter-profile-readiness-complete-panel"
            className="flex flex-col gap-[11px] border-t border-admin-success/25 px-[18px] pb-4 pt-4"
            role="status"
          >
            <DriverBody done={done} total={total} pct={pct} showLock={false} driverText={driverText} />
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={DRIVER_CARD} style={{ top: STICKY_TOP }} role="status">
      <DriverBody done={done} total={total} pct={pct} showLock driverText={driverText} />
    </div>
  )
}
