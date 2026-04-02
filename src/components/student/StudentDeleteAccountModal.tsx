import { useEffect, useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  onDelete: () => Promise<void>
  deleting: boolean
  error: string | null
}

export function StudentDeleteAccountModal({ open, onClose, onDelete, deleting, error }: Props) {
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    if (!open) setConfirmText('')
  }, [open])

  if (!open) return null

  const canSubmit = confirmText === 'DELETE' && !deleting

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={() => !deleting && onClose()}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        <h3 id="delete-account-title" className="text-lg font-semibold text-gray-900">
          Delete account
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Are you sure? This will permanently delete your account and all uploaded documents. This cannot be undone.
        </p>
        <label htmlFor="delete-account-confirm" className="block text-sm font-semibold text-gray-900 mt-4 mb-1">
          Type <span className="font-mono">DELETE</span> to confirm
        </label>
        <input
          id="delete-account-confirm"
          type="text"
          autoComplete="off"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          disabled={deleting}
          className="w-full rounded-lg border border-gray-900/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white font-mono"
          placeholder="DELETE"
        />
        {error && (
          <p className="text-xs text-red-600 mt-3" role="alert">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3 justify-end">
          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white text-gray-700 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void onDelete()}
            className="rounded-xl bg-red-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'Deleting…' : 'Delete account'}
          </button>
        </div>
      </div>
    </div>
  )
}
