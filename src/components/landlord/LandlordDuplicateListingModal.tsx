type Props = {
  open: boolean
  duplicatingListingId: string | null
  onConfirm: () => void
  onCancel: () => void
}

export default function LandlordDuplicateListingModal({
  open,
  duplicatingListingId,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (!duplicatingListingId) onCancel()
        }}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900">Duplicate listing?</h3>
        <p className="mt-2 text-sm text-gray-600">
          This will create a draft copy of this listing. You can then edit the room details.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={Boolean(duplicatingListingId)}
            className="rounded-xl bg-[#FF6F61] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#e85d52] disabled:opacity-60"
          >
            {duplicatingListingId ? 'Duplicating…' : 'Confirm'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={Boolean(duplicatingListingId)}
            className="rounded-xl border border-gray-300 bg-white text-gray-700 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
