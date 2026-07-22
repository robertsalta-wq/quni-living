import { renterWriteErrorClass } from '../../lib/renterProfileFormClasses'

const defaultPickButtonClass =
  'w-full sm:w-auto min-h-[3rem] px-6 rounded-lg border-2 border-indigo-600 text-indigo-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-indigo-50 disabled:opacity-50'

/**
 * Button-only picker trigger. The actual hidden <input type="file"> lives at the
 * root of StudentVerificationPanel (hoisted with a stable key) so that re-renders
 * of the surrounding card UI never tear down / remount the input — which on
 * Android Chrome would drop the picker's `change` event. This component just
 * invokes the panel-level click callback.
 */
export function StudentVerificationDocPick({
  busy,
  label,
  busyLabel = 'Uploading…',
  error,
  onPickClick,
  variant = 'default',
}: {
  busy: boolean
  label: string
  busyLabel?: string
  error: string | null
  onPickClick: () => void
  variant?: 'default' | 'renter-profile'
}) {
  const buttonClass = variant === 'renter-profile' ? 'renter-profile-upload-btn' : defaultPickButtonClass

  return (
    <div className="min-w-0">
      <button type="button" disabled={busy} onClick={onPickClick} className={buttonClass}>
        {variant === 'renter-profile' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M17 8l-5-5-5 5" />
            <path d="M12 3v12" />
          </svg>
        ) : (
          <span className="text-lg leading-none">+</span>
        )}
        {busy ? busyLabel : label}
      </button>
      {error ? (
        <p
          className={variant === 'renter-profile' ? renterWriteErrorClass : 'mt-2 break-words text-xs text-red-600'}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
