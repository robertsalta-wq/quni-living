import type { BookingFitRow } from '../../lib/bookingFitSummary'

function statusChip(status: BookingFitRow['status']) {
  if (status === 'match') return 'bg-emerald-100 text-emerald-900'
  if (status === 'mismatch') return 'bg-rose-100 text-rose-900'
  return 'bg-gray-100 text-gray-700'
}

function statusLabel(status: BookingFitRow['status']) {
  if (status === 'match') return 'Match'
  if (status === 'mismatch') return 'Check'
  return 'Unknown'
}

type Props = {
  rows: BookingFitRow[]
}

export default function BookingFitSummaryTable({ rows }: Props) {
  return (
    <>
      <div className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl border border-gray-100 bg-white p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-gray-900">{row.label}</p>
              <span
                className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${statusChip(row.status)}`}
              >
                {statusLabel(row.status)}
              </span>
            </div>
            <dl className="mt-2.5 space-y-2 text-xs">
              <div>
                <dt className="font-semibold uppercase tracking-wide text-gray-500">Student</dt>
                <dd className="mt-0.5 text-gray-800 leading-snug">{row.studentSide}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide text-gray-500">Listing</dt>
                <dd className="mt-0.5 text-gray-700 leading-snug">{row.propertySide}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <div className="hidden sm:block rounded-xl border border-gray-100 overflow-hidden bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50/90 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-3 py-2.5">Topic</th>
              <th className="px-3 py-2.5">Student</th>
              <th className="px-3 py-2.5">Listing</th>
              <th className="px-3 py-2.5 w-24">Fit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-gray-100 align-top">
                <td className="px-3 py-2.5 font-medium text-gray-900">{row.label}</td>
                <td className="px-3 py-2.5 text-gray-700">{row.studentSide}</td>
                <td className="px-3 py-2.5 text-gray-600">{row.propertySide}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusChip(row.status)}`}
                  >
                    {statusLabel(row.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
