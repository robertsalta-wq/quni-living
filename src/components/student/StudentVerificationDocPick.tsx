const pickButtonClass =
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
}: {
  busy: boolean
  label: string
  busyLabel?: string
  error: string | null
  onPickClick: () => void
}) {
  return (
    <div className="min-w-0">
      <button type="button" disabled={busy} onClick={onPickClick} className={pickButtonClass}>
        <span className="text-lg leading-none">+</span>
        {busy ? busyLabel : label}
      </button>
      {error ? <p className="text-xs text-red-600 mt-2 break-words">{error}</p> : null}
    </div>
  )
}
