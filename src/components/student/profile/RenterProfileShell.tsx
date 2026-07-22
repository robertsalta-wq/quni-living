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
    <div className="renter-profile-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="switch-situation-title">
      <div className="renter-profile-modal">
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div className="renter-profile-icon-wrap">
            <RefreshCw size={19} aria-hidden />
          </div>
          <div id="switch-situation-title" style={{ fontSize: 17, fontWeight: 700, color: 'var(--quni-ink)' }}>
            Switch your situation?
          </div>
        </div>
        <p style={{ marginTop: 13, fontSize: 13.5, color: 'var(--quni-ink-3)', lineHeight: 1.55 }}>
          Switching to <strong style={{ color: 'var(--quni-ink)', fontWeight: 600 }}>{nextLabel}</strong> clears the
          details in your <strong style={{ color: 'var(--quni-ink)', fontWeight: 600 }}>{fromSectionTitle}</strong>{' '}
          section. Personal details, verification and emergency contact stay as they are.
        </p>
        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button type="button" className="renter-profile-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="renter-profile-btn-primary" style={{ flex: 1 }} onClick={onConfirm}>
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
