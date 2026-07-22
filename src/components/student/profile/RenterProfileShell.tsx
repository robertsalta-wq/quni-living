import { StatusPill } from '../../ui/Section'
import { RefreshCw, ProfileSectionIcon } from './profileSectionIcons'
import { routeSectionTitle } from '../../../lib/renterProfileSection'
import type { RenterSituation } from '../../../lib/renterSituation'
import {
  renterIconWrapClass,
  renterIconWrapLgClass,
  renterSaveBtnClass,
  renterSecondaryBtnClass,
} from '../../../lib/renterProfileFormClasses'

type Props = {
  nextSituation: RenterSituation
  fromSituation: RenterSituation
  onConfirm: () => void
  onCancel: () => void
}

/** R2a: quni-modal surface (visual-gate covered). */
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
          <div className={renterIconWrapClass}>
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
          <button type="button" className={`${renterSecondaryBtnClass} flex-1`} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={`${renterSaveBtnClass} flex-1 self-auto`} onClick={onConfirm}>
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
      className="quni-card flex items-center gap-[14px] border-dashed border-[var(--quni-line)] px-5 py-[17px] font-sans"
      id="renter-section-route-locked"
    >
      <div className={`${renterIconWrapLgClass} bg-[var(--quni-surface-3)] text-[var(--quni-ink-5)]`}>
        <ProfileSectionIcon kind="verify" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-[9px]">
          <span className="shrink-0 text-[var(--text-caption-size)] font-bold tracking-[0.02em] text-[var(--quni-ink-5)]">
            03
          </span>
          <span className="text-[var(--text-body-size)] font-semibold tracking-[-0.01em] text-[var(--quni-ink-5)]">
            Your route details
          </span>
        </div>
        <p className="mt-[3px] text-[13px] text-[var(--quni-ink-5)]">Choose your situation to unlock</p>
      </div>
      <StatusPill status="locked" />
    </div>
  )
}
