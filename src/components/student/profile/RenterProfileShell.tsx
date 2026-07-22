import { RefreshCw, ProfileSectionIcon } from './profileSectionIcons'
import { routeSectionTitle } from '../../../lib/renterProfileSection'
import type { RenterSituation } from '../../../lib/renterSituation'

type Props = {
  nextSituation: RenterSituation
  fromSituation: RenterSituation
  onConfirm: () => void
  onCancel: () => void
}

export function SwitchSituationDialog({ nextSituation, fromSituation, onConfirm, onCancel }: Props) {
  const nextLabel =
    nextSituation === 'working_holiday'
      ? 'Working holiday'
      : nextSituation === 'between_jobs'
        ? 'Between jobs'
        : nextSituation.charAt(0).toUpperCase() + nextSituation.slice(1).replace('_', ' ')

  const fromSectionTitle = routeSectionTitle(fromSituation)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-[22px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="switch-situation-title"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} aria-hidden />
      <div className="quni-modal relative z-10 w-full max-w-[320px] px-[22px] pb-[18px] pt-[22px]">
        <div className="flex items-center gap-[11px]">
          <div className="renter-profile-icon-wrap">
            <RefreshCw size={19} aria-hidden />
          </div>
          <div id="switch-situation-title" className="text-[17px] font-bold text-[var(--quni-ink)]">
            Switch your situation?
          </div>
        </div>
        <p className="mt-[13px] text-[13.5px] leading-normal text-[var(--quni-ink-3)]">
          Switching to <strong className="font-semibold text-[var(--quni-ink)]">{nextLabel}</strong> clears the
          details in your <strong className="font-semibold text-[var(--quni-ink)]">{fromSectionTitle}</strong>{' '}
          section. Personal details, verification and emergency contact stay as they are.
        </p>
        <div className="mt-5 flex gap-2.5">
          <button type="button" className="renter-profile-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="renter-profile-btn-primary flex-1" onClick={onConfirm}>
            Switch
          </button>
        </div>
      </div>
    </div>
  )
}

export function RenterProfileLockedRouteSection() {
  return (
    <div
      className="quni-card flex items-center gap-[14px] border-dashed border-[var(--quni-line)] px-5 py-[17px]"
      id="renter-section-route-locked"
    >
      <div className="renter-profile-icon-wrap renter-profile-icon-wrap-lg" style={{ background: 'var(--quni-surface-3)', color: 'var(--quni-ink-5)' }}>
        <ProfileSectionIcon kind="verify" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
          <span className="renter-profile-section-num" style={{ color: 'var(--quni-ink-5)' }}>
            03
          </span>
          <span className="renter-profile-section-title" style={{ color: 'var(--quni-ink-5)' }}>
            Your route details
          </span>
        </div>
        <p style={{ marginTop: 3, fontSize: 13, color: 'var(--quni-ink-5)' }}>Choose your situation to unlock</p>
      </div>
      <span className="renter-profile-pill renter-profile-pill-locked">Locked</span>
    </div>
  )
}
