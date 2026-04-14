import { Link } from 'react-router-dom'
import type { LandlordPropertyForListingActions } from '../../hooks/useLandlordPropertyListingActions'

type Props = {
  property: LandlordPropertyForListingActions
  publishingListingId: string | null
  duplicatingListingId: string | null
  updatingListingId: string | null
  onPublish: (p: LandlordPropertyForListingActions) => void
  onDuplicateClick: (p: LandlordPropertyForListingActions) => void
  onToggle: (p: LandlordPropertyForListingActions) => void
}

export default function LandlordPropertyListingActions({
  property: p,
  publishingListingId,
  duplicatingListingId,
  updatingListingId,
  onPublish,
  onDuplicateClick,
  onToggle,
}: Props) {
  return (
    <div className="mt-auto flex flex-col gap-2">
      <div className="flex gap-2">
        <Link
          to={`/landlord/property/edit/${p.id}`}
          className="flex-1 text-center rounded-lg border border-gray-200 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Edit
        </Link>
        <Link
          to={`/properties/${p.slug}`}
          className="flex-1 text-center rounded-lg bg-[#FF6F61] py-2 text-sm font-medium text-white hover:bg-[#e85d52]"
        >
          View
        </Link>
      </div>
      <div className="flex gap-2 flex-wrap">
        {p.status === 'draft' && (
          <button
            type="button"
            onClick={() => void onPublish(p)}
            disabled={publishingListingId === p.id || duplicatingListingId === p.id}
            className="flex-1 min-w-[7.5rem] text-center rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-60"
          >
            {publishingListingId === p.id ? 'Publishing…' : 'Publish'}
          </button>
        )}
        <button
          type="button"
          onClick={() => onDuplicateClick(p)}
          disabled={duplicatingListingId === p.id || publishingListingId === p.id}
          className="flex-1 min-w-[7.5rem] text-center rounded-lg border border-indigo-200 bg-indigo-50 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 disabled:opacity-60"
        >
          {duplicatingListingId === p.id ? 'Duplicating…' : 'Duplicate'}
        </button>
        {(p.status === 'active' || p.status === 'inactive') && (
          <button
            type="button"
            onClick={() => void onToggle(p)}
            disabled={updatingListingId === p.id}
            className={[
              'flex-1 min-w-[7.5rem] text-center rounded-lg border bg-white py-2 text-sm font-medium disabled:opacity-60',
              p.status === 'active'
                ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50',
            ].join(' ')}
          >
            {updatingListingId === p.id ? 'Updating...' : p.status === 'active' ? 'Pause listing' : 'Reactivate'}
          </button>
        )}
      </div>
    </div>
  )
}
