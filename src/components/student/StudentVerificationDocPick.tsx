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
}: {
  // Optional: when undefined the picker applies no type filter (React omits the
  // attribute). Used for supporting/enrolment docs to avoid the Android picker
  // bug with mixed image+PDF accept lists. JS validates the file after pick.
  accept?: string
  busy: boolean
  label: string
  busyLabel?: string
  error: string | null
  onFileSelected: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
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
        onClick={() => inputRef.current?.click()}
        className={pickButtonClass}
      >
        <span className="text-lg leading-none">+</span>
        {busy ? busyLabel : label}
      </button>
      {error ? <p className="text-xs text-red-600 mt-2 break-words">{error}</p> : null}
    </div>
  )
}
