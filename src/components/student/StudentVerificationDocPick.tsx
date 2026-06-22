import { useRef, type ChangeEvent } from 'react'

const pickButtonClass =
  'w-full sm:w-auto min-h-[3rem] px-6 rounded-lg border-2 border-indigo-600 text-indigo-600 font-medium text-sm flex items-center justify-center gap-2 hover:bg-indigo-50 disabled:opacity-50'

/**
 * File picker matching the profile photo control in StudentProfile.tsx —
 * input + button in one component so mobile keeps the user-gesture chain intact.
 */
export function StudentVerificationDocPick({
  accept,
  busy,
  label,
  busyLabel = 'Uploading…',
  error,
  onFileSelected,
  onPickDiag,
}: {
  // Optional: when undefined, the picker applies no type filter (React omits the
  // attribute). Used for supporting docs to dodge the Android mixed-accept bug.
  accept?: string
  busy: boolean
  label: string
  busyLabel?: string
  error: string | null
  onFileSelected: (file: File) => void
  // TEMP DIAGNOSTIC: reports picker lifecycle so a silent device tells us where it stalls.
  onPickDiag?: (msg: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    const file = files?.[0]
    onPickDiag?.(
      `change fired: ${files?.length ?? 0} file(s)` +
        (file ? ` name=${file.name || '(none)'} type=${file.type || '(none)'} size=${file.size}b` : ' (no file)'),
    )
    e.target.value = ''
    if (!file) return
    onFileSelected(file)
  }

  return (
    <div className="min-w-0">
      <input ref={inputRef} type="file" accept={accept} className="sr-only" onChange={onChange} />
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          onPickDiag?.('button tapped → opening picker')
          inputRef.current?.click()
        }}
        className={pickButtonClass}
      >
        <span className="text-lg leading-none">+</span>
        {busy ? busyLabel : label}
      </button>
      {error ? <p className="text-xs text-red-600 mt-2 break-words">{error}</p> : null}
    </div>
  )
}
