import type { VerificationItemRightSlot } from '../../../lib/verificationItemState'
import {
  renterFilledRowActionClass,
  renterUploadFilledClass,
  renterUploadFilledTextClass,
} from '../../../lib/renterProfileFormClasses'

type Props = {
  value: string
  rightSlot: VerificationItemRightSlot
  onAction?: () => void
  actionDisabled?: boolean
}

function TickIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function PillCheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

export function RenterProfileVerificationRow({ value, rightSlot, onAction, actionDisabled = false }: Props) {
  return (
    <div className={renterUploadFilledClass}>
      <TickIcon />
      <span className={renterUploadFilledTextClass}>{value}</span>
      {rightSlot.kind === 'action' ? (
        <button
          type="button"
          className={renterFilledRowActionClass}
          onClick={onAction}
          disabled={actionDisabled || !onAction}
        >
          {rightSlot.action === 'replace' ? 'Replace' : 'Edit'}
        </button>
      ) : rightSlot.kind === 'verified' ? (
        <span className="renter-profile-pill renter-profile-pill-done renter-profile-pill-inline">
          <PillCheckIcon />
          Verified
        </span>
      ) : (
        <span className="renter-profile-pill renter-profile-pill-review renter-profile-pill-inline">In review</span>
      )}
    </div>
  )
}
